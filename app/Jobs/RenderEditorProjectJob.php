<?php

namespace App\Jobs;

use App\Events\EditorProjectRenderUpdated;
use App\Models\EditorProject;
use App\Models\EditorProjectAsset;
use App\Models\EditorProjectRender;
use App\Models\EditorProjectSubtitle;
use App\Support\AuditTrail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use Throwable;

class RenderEditorProjectJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 14400;
    public int $tries = 1;

    public function __construct(
        private readonly int $projectId,
        private readonly int $renderId,
    ) {
    }

    public function handle(): void
    {
        $project = EditorProject::query()
            ->with(['assets', 'subtitles'])
            ->find($this->projectId);
        $render = EditorProjectRender::query()->find($this->renderId);

        if (! $project || ! $render) {
            return;
        }

        $project->status = 'rendering';
        $project->save();

        $render->forceFill([
            'status' => 'processing',
            'progress_percent' => 5,
            'started_at' => now(),
            'error_message' => null,
        ])->save();
        $this->broadcastRender($project->id, $render);

        $tempDisk = Storage::disk('local');
        $tempBaseDir = "editor-projects/{$project->id}/tmp/render-{$render->id}";
        $tempAbsoluteDir = $tempDisk->path($tempBaseDir);

        if (! is_dir($tempAbsoluteDir)) {
            mkdir($tempAbsoluteDir, 0775, true);
        }

        try {
            $timeline = is_array($project->timeline_json) ? $project->timeline_json : [];
            $videoClips = $this->normalizeClipList($timeline['video_clips'] ?? []);
            $audioClips = $this->normalizeClipList($timeline['audio_clips'] ?? []);

            if ($videoClips === []) {
                $videoClips = $this->fallbackVideoClips($project->assets);
            }

            if ($videoClips === []) {
                throw new \RuntimeException('Adicione ao menos um clipe de vídeo na timeline para renderizar.');
            }

            $this->updateProgress($project, $render, 15);

            $trimmedVideoFiles = $this->buildTrimmedVideoFiles($project, $videoClips, $tempBaseDir);
            $baseVideoFile = $this->concatVideoFiles($trimmedVideoFiles, $tempBaseDir);

            $this->updateProgress($project, $render, 45);

            $mixedFile = $this->mixAudioLayers($project, $baseVideoFile, $audioClips, $tempBaseDir);

            $this->updateProgress($project, $render, 65);

            $subtitleFile = $this->buildSubtitleFile($project->subtitles, $tempBaseDir);
            $outputExtension = $render->output_mode === 'audio_only' ? 'mp3' : 'mp4';
            $outputRelativePath = "editor-renders/{$project->id}/{$render->id}/output.{$outputExtension}";
            $outputAbsolutePath = $tempDisk->path($outputRelativePath);
            $outputAbsoluteDir = dirname($outputAbsolutePath);

            if (! is_dir($outputAbsoluteDir)) {
                mkdir($outputAbsoluteDir, 0775, true);
            }

            $this->finalizeOutput($mixedFile, $subtitleFile, $render, $outputAbsolutePath);

            if (! is_file($outputAbsolutePath)) {
                throw new \RuntimeException('O arquivo final não foi gerado.');
            }

            $outputSize = filesize($outputAbsolutePath) ?: null;

            $render->forceFill([
                'status' => 'completed',
                'progress_percent' => 100,
                'output_path' => $outputRelativePath,
                'output_disk' => 'local',
                'output_size_bytes' => $outputSize,
                'finished_at' => now(),
            ])->save();

            $project->forceFill([
                'status' => 'rendered',
                'rendered_at' => now(),
                'source_assets_purged_at' => now(),
            ])->save();

            $this->purgeSourceAssets($project);

            $this->broadcastRender($project->id, $render);

            AuditTrail::record(
                'editor_render_completed',
                $project,
                $render->requested_by_user_id,
                $project->organization_id,
                null,
                [
                    'render_id' => $render->id,
                    'output_mode' => $render->output_mode,
                    'preset' => $render->preset,
                    'output_path' => $outputRelativePath,
                ],
            );
        } catch (Throwable $exception) {
            report($exception);

            $render->forceFill([
                'status' => 'failed',
                'progress_percent' => 100,
                'error_message' => $exception->getMessage(),
                'finished_at' => now(),
            ])->save();

            $project->forceFill([
                'status' => 'failed',
            ])->save();

            $this->broadcastRender($project->id, $render);

            AuditTrail::record(
                'editor_render_failed',
                $project,
                $render->requested_by_user_id,
                $project->organization_id,
                null,
                [
                    'render_id' => $render->id,
                    'error' => $exception->getMessage(),
                ],
            );
        } finally {
            if (is_dir($tempAbsoluteDir)) {
                $this->deleteDirectory($tempAbsoluteDir);
            }
        }
    }

    /**
     * @param  array<int, mixed>  $raw
     * @return array<int, array<string, int|float>>
     */
    private function normalizeClipList(array $raw): array
    {
        return collect($raw)
            ->map(function ($item): ?array {
                if (! is_array($item) || ! isset($item['asset_id'])) {
                    return null;
                }

                $assetId = (int) $item['asset_id'];
                $sourceInMs = max(0, (int) ($item['source_in_ms'] ?? 0));
                $sourceOutMs = max($sourceInMs + 1, (int) ($item['source_out_ms'] ?? ($sourceInMs + 1000)));
                $timelineStartMs = max(0, (int) ($item['timeline_start_ms'] ?? 0));
                $volumeGain = (float) ($item['volume_gain'] ?? 1.0);

                return [
                    'asset_id' => $assetId,
                    'source_in_ms' => $sourceInMs,
                    'source_out_ms' => $sourceOutMs,
                    'timeline_start_ms' => $timelineStartMs,
                    'volume_gain' => max(0.0, min(5.0, $volumeGain)),
                ];
            })
            ->filter()
            ->sortBy('timeline_start_ms')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, EditorProjectAsset>  $assets
     * @return array<int, array<string, int|float>>
     */
    private function fallbackVideoClips(Collection $assets): array
    {
        $cursorMs = 0;
        $clips = [];

        foreach ($assets->where('asset_type', 'video')->sortBy('sort_order') as $asset) {
            $duration = max(1000, (int) ($asset->duration_ms ?? 10000));
            $clips[] = [
                'asset_id' => (int) $asset->id,
                'source_in_ms' => 0,
                'source_out_ms' => $duration,
                'timeline_start_ms' => $cursorMs,
                'volume_gain' => 1.0,
            ];
            $cursorMs += $duration;
        }

        return $clips;
    }

    /**
     * @param  array<int, array<string, int|float>>  $videoClips
     * @return array<int, string>
     */
    private function buildTrimmedVideoFiles(EditorProject $project, array $videoClips, string $tempBaseDir): array
    {
        $assetById = $project->assets->keyBy('id');
        $output = [];

        foreach ($videoClips as $index => $clip) {
            $asset = $assetById->get((int) $clip['asset_id']);
            if (! $asset || $asset->asset_type !== 'video') {
                continue;
            }

            $inputPath = Storage::disk($asset->disk ?: 'local')->path($asset->path);
            if (! is_file($inputPath)) {
                continue;
            }

            $out = Storage::disk('local')->path("{$tempBaseDir}/video_clip_{$index}.mp4");
            $sourceInSeconds = number_format(((int) $clip['source_in_ms']) / 1000, 3, '.', '');
            $sourceOutSeconds = number_format(((int) $clip['source_out_ms']) / 1000, 3, '.', '');
            $volume = number_format((float) $clip['volume_gain'], 3, '.', '');

            $process = new Process([
                (string) config('editor.ffmpeg_bin', 'ffmpeg'),
                '-y',
                '-ss',
                $sourceInSeconds,
                '-to',
                $sourceOutSeconds,
                '-i',
                $inputPath,
                '-vf',
                'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-af',
                "volume={$volume}",
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-crf',
                '22',
                '-c:a',
                'aac',
                '-b:a',
                '192k',
                $out,
            ]);
            $this->runProcess($process);
            $output[] = $out;
        }

        if ($output === []) {
            throw new \RuntimeException('Nenhum clipe de vídeo válido para renderização.');
        }

        return $output;
    }

    /**
     * @param  array<int, string>  $trimmedVideoFiles
     */
    private function concatVideoFiles(array $trimmedVideoFiles, string $tempBaseDir): string
    {
        $concatPath = Storage::disk('local')->path("{$tempBaseDir}/concat.txt");
        $baseOutput = Storage::disk('local')->path("{$tempBaseDir}/base_video.mp4");

        $lines = array_map(
            static fn (string $filePath): string => "file '".str_replace("'", "'\\''", $filePath)."'",
            $trimmedVideoFiles
        );
        file_put_contents($concatPath, implode(PHP_EOL, $lines));

        $process = new Process([
            (string) config('editor.ffmpeg_bin', 'ffmpeg'),
            '-y',
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            $concatPath,
            '-c:v',
            'libx264',
            '-preset',
            'medium',
            '-crf',
            '21',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            $baseOutput,
        ]);
        $this->runProcess($process);

        return $baseOutput;
    }

    /**
     * @param  array<int, array<string, int|float>>  $audioClips
     */
    private function mixAudioLayers(EditorProject $project, string $baseVideoFile, array $audioClips, string $tempBaseDir): string
    {
        if ($audioClips === []) {
            return $baseVideoFile;
        }

        $assetById = $project->assets->keyBy('id');
        $audioInputs = [];

        foreach ($audioClips as $index => $clip) {
            $asset = $assetById->get((int) $clip['asset_id']);
            if (! $asset || ! in_array($asset->asset_type, ['audio', 'video'], true)) {
                continue;
            }

            $inputPath = Storage::disk($asset->disk ?: 'local')->path($asset->path);
            if (! is_file($inputPath)) {
                continue;
            }

            $out = Storage::disk('local')->path("{$tempBaseDir}/audio_overlay_{$index}.wav");
            $sourceInSeconds = number_format(((int) $clip['source_in_ms']) / 1000, 3, '.', '');
            $sourceOutSeconds = number_format(((int) $clip['source_out_ms']) / 1000, 3, '.', '');
            $volume = number_format((float) $clip['volume_gain'], 3, '.', '');

            $process = new Process([
                (string) config('editor.ffmpeg_bin', 'ffmpeg'),
                '-y',
                '-ss',
                $sourceInSeconds,
                '-to',
                $sourceOutSeconds,
                '-i',
                $inputPath,
                '-vn',
                '-af',
                "volume={$volume}",
                '-ac',
                '2',
                '-ar',
                '48000',
                $out,
            ]);
            $this->runProcess($process);

            $audioInputs[] = [
                'path' => $out,
                'start_ms' => (int) $clip['timeline_start_ms'],
            ];
        }

        if ($audioInputs === []) {
            return $baseVideoFile;
        }

        $output = Storage::disk('local')->path("{$tempBaseDir}/mixed_video.mp4");

        $command = [
            (string) config('editor.ffmpeg_bin', 'ffmpeg'),
            '-y',
            '-i',
            $baseVideoFile,
        ];

        foreach ($audioInputs as $input) {
            $command[] = '-i';
            $command[] = $input['path'];
        }

        $filterParts = [];
        $overlayTags = [];

        foreach ($audioInputs as $index => $input) {
            $ffIndex = $index + 1;
            $delay = max(0, (int) $input['start_ms']);
            $tag = "ov{$ffIndex}";
            $filterParts[] = "[{$ffIndex}:a]adelay={$delay}|{$delay}[{$tag}]";
            $overlayTags[] = "[{$tag}]";
        }

        $amixInputs = '[0:a]'.implode('', $overlayTags);
        $filterParts[] = "{$amixInputs}amix=inputs=".(count($audioInputs) + 1).":normalize=0[aout]";

        $command[] = '-filter_complex';
        $command[] = implode(';', $filterParts);
        $command[] = '-map';
        $command[] = '0:v:0';
        $command[] = '-map';
        $command[] = '[aout]';
        $command[] = '-c:v';
        $command[] = 'copy';
        $command[] = '-c:a';
        $command[] = 'aac';
        $command[] = '-b:a';
        $command[] = '192k';
        $command[] = $output;

        $process = new Process($command);
        $this->runProcess($process);

        return $output;
    }

    private function buildSubtitleFile(Collection $subtitles, string $tempBaseDir): ?string
    {
        if ($subtitles->isEmpty()) {
            return null;
        }

        $path = Storage::disk('local')->path("{$tempBaseDir}/subtitles.srt");
        $lines = [];

        /** @var EditorProjectSubtitle $subtitle */
        foreach ($subtitles->sortBy('start_ms')->values() as $index => $subtitle) {
            $lines[] = (string) ($index + 1);
            $lines[] = $this->formatSrtTime((int) $subtitle->start_ms).' --> '.$this->formatSrtTime((int) $subtitle->end_ms);
            $lines[] = trim((string) $subtitle->text);
            $lines[] = '';
        }

        file_put_contents($path, implode(PHP_EOL, $lines));

        return $path;
    }

    private function finalizeOutput(string $inputVideoFile, ?string $subtitleFile, EditorProjectRender $render, string $outputAbsolutePath): void
    {
        if ($render->output_mode === 'audio_only') {
            $process = new Process([
                (string) config('editor.ffmpeg_bin', 'ffmpeg'),
                '-y',
                '-i',
                $inputVideoFile,
                '-vn',
                '-c:a',
                'libmp3lame',
                '-b:a',
                '256k',
                $outputAbsolutePath,
            ]);
            $this->runProcess($process);

            return;
        }

        $presetArgs = $this->videoEncodingArgsForPreset($render->preset);

        if ($subtitleFile && $render->output_mode === 'video_with_soft_subtitles') {
            $subtitleScaleFilter = "scale=-2:{$presetArgs['height']}";
            $process = new Process([
                (string) config('editor.ffmpeg_bin', 'ffmpeg'),
                '-y',
                '-i',
                $inputVideoFile,
                '-i',
                $subtitleFile,
                '-vf',
                $subtitleScaleFilter,
                '-map',
                '0:v:0',
                '-map',
                '0:a:0',
                '-map',
                '1:0',
                '-c:v',
                'libx264',
                '-preset',
                $presetArgs['preset'],
                '-crf',
                $presetArgs['crf'],
                '-c:a',
                'aac',
                '-b:a',
                $presetArgs['audio_bitrate'],
                '-c:s',
                'mov_text',
                $outputAbsolutePath,
            ]);
            $this->runProcess($process);

            return;
        }

        if ($subtitleFile && $render->output_mode === 'video_with_burned_subtitles') {
            $escapedSubtitlePath = $this->escapeFilterPath($subtitleFile);
            $subtitleFilter = "subtitles='{$escapedSubtitlePath}',scale=-2:{$presetArgs['height']}";
            $process = new Process([
                (string) config('editor.ffmpeg_bin', 'ffmpeg'),
                '-y',
                '-i',
                $inputVideoFile,
                '-vf',
                $subtitleFilter,
                '-c:v',
                'libx264',
                '-preset',
                $presetArgs['preset'],
                '-crf',
                $presetArgs['crf'],
                '-c:a',
                'aac',
                '-b:a',
                $presetArgs['audio_bitrate'],
                $outputAbsolutePath,
            ]);
            $this->runProcess($process);

            return;
        }

        $process = new Process([
            (string) config('editor.ffmpeg_bin', 'ffmpeg'),
            '-y',
            '-i',
            $inputVideoFile,
            '-vf',
            "scale=-2:{$presetArgs['height']}",
            '-c:v',
            'libx264',
            '-preset',
            $presetArgs['preset'],
            '-crf',
            $presetArgs['crf'],
            '-c:a',
            'aac',
            '-b:a',
            $presetArgs['audio_bitrate'],
            $outputAbsolutePath,
        ]);
        $this->runProcess($process);
    }

    private function formatSrtTime(int $ms): string
    {
        $ms = max(0, $ms);
        $hours = intdiv($ms, 3600000);
        $ms %= 3600000;
        $minutes = intdiv($ms, 60000);
        $ms %= 60000;
        $seconds = intdiv($ms, 1000);
        $millis = $ms % 1000;

        return sprintf('%02d:%02d:%02d,%03d', $hours, $minutes, $seconds, $millis);
    }

    private function updateProgress(EditorProject $project, EditorProjectRender $render, int $progress): void
    {
        $render->progress_percent = max(0, min(100, $progress));
        $render->save();

        $this->broadcastRender($project->id, $render);
    }

    private function broadcastRender(int $projectId, EditorProjectRender $render): void
    {
        try {
            broadcast(new EditorProjectRenderUpdated($projectId, $render));
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function runProcess(Process $process): void
    {
        $process->setTimeout(null);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }
    }

    private function purgeSourceAssets(EditorProject $project): void
    {
        $assets = EditorProjectAsset::query()
            ->where('project_id', $project->id)
            ->get();

        foreach ($assets as $asset) {
            $disk = $asset->disk ?: 'local';
            $paths = array_filter([
                $asset->path,
                $asset->waveform_path,
                $asset->thumbnail_path,
                $asset->preview_frame_path,
            ]);

            if ($paths !== []) {
                Storage::disk($disk)->delete($paths);
            }
        }
    }

    private function deleteDirectory(string $absoluteDirectoryPath): void
    {
        if (! is_dir($absoluteDirectoryPath)) {
            return;
        }

        $items = scandir($absoluteDirectoryPath);
        if (! is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if (in_array($item, ['.', '..'], true)) {
                continue;
            }

            $path = $absoluteDirectoryPath.DIRECTORY_SEPARATOR.$item;
            if (is_dir($path)) {
                $this->deleteDirectory($path);
                continue;
            }

            @unlink($path);
        }

        @rmdir($absoluteDirectoryPath);
    }

    /**
     * @return array{height:int, crf:string, preset:string, audio_bitrate:string}
     */
    private function videoEncodingArgsForPreset(string $preset): array
    {
        return match ($preset) {
            'preview_720p' => [
                'height' => 720,
                'crf' => '24',
                'preset' => 'veryfast',
                'audio_bitrate' => '128k',
            ],
            'ultra_hd_4k' => [
                'height' => 2160,
                'crf' => '20',
                'preset' => 'slow',
                'audio_bitrate' => '256k',
            ],
            default => [
                'height' => 1080,
                'crf' => '22',
                'preset' => 'medium',
                'audio_bitrate' => '192k',
            ],
        };
    }

    private function escapeFilterPath(string $path): string
    {
        return str_replace(
            ['\\', ':', "'", ',', '[', ']'],
            ['\\\\', '\\:', "\\'", '\\,', '\\[', '\\]'],
            $path
        );
    }
}
