<?php

namespace App\Jobs;

use App\Events\EditorProjectAssetUpdated;
use App\Models\EditorProjectAsset;
use App\Support\AuditTrail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use Throwable;

class ProcessEditorAssetJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;
    public int $tries = 1;

    public function __construct(
        private readonly int $assetId,
    ) {
    }

    public function handle(): void
    {
        $asset = EditorProjectAsset::query()
            ->with(['project'])
            ->find($this->assetId);

        if (! $asset || ! $asset->project) {
            return;
        }

        $project = $asset->project;
        $disk = $asset->disk ?: 'local';
        $absoluteInput = Storage::disk($disk)->path($asset->path);

        if (! is_file($absoluteInput)) {
            return;
        }

        try {
            $metadata = $this->probe($absoluteInput);

            $durationMs = $this->resolveDurationMs($metadata);
            $videoWidth = $this->resolveInt($metadata, ['streams.0.width', 'streams.1.width']);
            $videoHeight = $this->resolveInt($metadata, ['streams.0.height', 'streams.1.height']);
            $fps = $this->resolveFps($metadata);
            $sampleRate = $this->resolveInt($metadata, ['streams.0.sample_rate', 'streams.1.sample_rate']);
            $channels = $this->resolveInt($metadata, ['streams.0.channels', 'streams.1.channels']);

            $waveformPath = $asset->waveform_path;
            $thumbnailPath = $asset->thumbnail_path;
            $previewFramePath = $asset->preview_frame_path;

            if ($asset->asset_type === 'audio' || $asset->asset_type === 'video') {
                $waveformPath = $this->generateWaveform($asset, $absoluteInput);
            }

            if ($asset->asset_type === 'video') {
                $thumbnailPath = $this->generateVideoFrame($asset, $absoluteInput, 'thumbnail');
                $previewFramePath = $this->generateVideoFrame($asset, $absoluteInput, 'frame');
            }

            $asset->forceFill([
                'duration_ms' => $durationMs,
                'video_width' => $videoWidth,
                'video_height' => $videoHeight,
                'fps' => $fps,
                'sample_rate' => $sampleRate,
                'channels' => $channels,
                'waveform_path' => $waveformPath,
                'thumbnail_path' => $thumbnailPath,
                'preview_frame_path' => $previewFramePath,
                'metadata_json' => $metadata,
                'processed_at' => now(),
            ])->save();

            $this->broadcastSafely(new EditorProjectAssetUpdated($project->id, $asset->fresh()));

            AuditTrail::record(
                'editor_asset_processed',
                $project,
                $project->owner_user_id,
                $project->organization_id,
                null,
                ['asset_id' => $asset->id, 'asset_type' => $asset->asset_type],
                ['job' => self::class],
            );
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function probe(string $absoluteInput): array
    {
        $process = new Process([
            (string) config('editor.ffprobe_bin', 'ffprobe'),
            '-v',
            'error',
            '-print_format',
            'json',
            '-show_streams',
            '-show_format',
            $absoluteInput,
        ]);

        $process->setTimeout(120);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $decoded = json_decode($process->getOutput(), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function generateWaveform(EditorProjectAsset $asset, string $absoluteInput): ?string
    {
        $relative = "editor-waveforms/{$asset->project_id}/{$asset->id}.png";
        $absoluteOutput = Storage::disk('local')->path($relative);
        $outputDir = dirname($absoluteOutput);

        if (! is_dir($outputDir)) {
            mkdir($outputDir, 0775, true);
        }

        $process = new Process([
            (string) config('editor.ffmpeg_bin', 'ffmpeg'),
            '-y',
            '-i',
            $absoluteInput,
            '-filter_complex',
            'aformat=channel_layouts=mono,showwavespic=s=1200x240:colors=#9f7aea',
            '-frames:v',
            '1',
            $absoluteOutput,
        ]);

        $process->setTimeout(120);
        $process->run();

        return $process->isSuccessful() && is_file($absoluteOutput) ? $relative : null;
    }

    private function generateVideoFrame(EditorProjectAsset $asset, string $absoluteInput, string $kind): ?string
    {
        $folder = $kind === 'thumbnail' ? 'editor-thumbnails' : 'editor-frames';
        $relative = "{$folder}/{$asset->project_id}/{$asset->id}.jpg";
        $absoluteOutput = Storage::disk('local')->path($relative);
        $outputDir = dirname($absoluteOutput);

        if (! is_dir($outputDir)) {
            mkdir($outputDir, 0775, true);
        }

        $seekSeconds = 0.8;
        if (is_int($asset->duration_ms) && $asset->duration_ms > 3000) {
            $seekSeconds = max(0.8, min(($asset->duration_ms / 1000) / 2, 60));
        }

        $process = new Process([
            (string) config('editor.ffmpeg_bin', 'ffmpeg'),
            '-y',
            '-ss',
            number_format($seekSeconds, 3, '.', ''),
            '-i',
            $absoluteInput,
            '-frames:v',
            '1',
            '-q:v',
            '2',
            $absoluteOutput,
        ]);

        $process->setTimeout(120);
        $process->run();

        return $process->isSuccessful() && is_file($absoluteOutput) ? $relative : null;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function resolveDurationMs(array $metadata): ?int
    {
        $duration = data_get($metadata, 'format.duration');
        if (! is_numeric($duration)) {
            return null;
        }

        return max(0, (int) round(((float) $duration) * 1000));
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @param  array<int, string>  $paths
     */
    private function resolveInt(array $metadata, array $paths): ?int
    {
        foreach ($paths as $path) {
            $value = data_get($metadata, $path);
            if (is_numeric($value)) {
                return (int) $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function resolveFps(array $metadata): ?float
    {
        $raw = data_get($metadata, 'streams.0.avg_frame_rate') ?? data_get($metadata, 'streams.0.r_frame_rate');
        if (! is_string($raw) || $raw === '' || $raw === '0/0') {
            return null;
        }

        if (! str_contains($raw, '/')) {
            return is_numeric($raw) ? (float) $raw : null;
        }

        [$num, $den] = explode('/', $raw, 2);
        if (! is_numeric($num) || ! is_numeric($den) || (float) $den == 0.0) {
            return null;
        }

        return round(((float) $num) / ((float) $den), 3);
    }

    private function broadcastSafely(object $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
