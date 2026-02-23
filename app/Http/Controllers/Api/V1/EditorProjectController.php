<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessEditorAssetJob;
use App\Jobs\RenderEditorProjectJob;
use App\Models\EditorProject;
use App\Models\EditorProjectAsset;
use App\Models\EditorProjectComment;
use App\Models\EditorProjectEvent;
use App\Models\EditorProjectRender;
use App\Models\EditorProjectSubtitle;
use App\Models\Organization;
use App\Models\User;
use App\Support\AuditTrail;
use App\Support\MediaAccess;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EditorProjectController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const RENDER_PRESETS = [
        'preview_720p',
        'full_hd_1080p',
        'ultra_hd_4k',
    ];

    /**
     * @var array<int, string>
     */
    private const OUTPUT_MODES = [
        'video_with_soft_subtitles',
        'video_with_burned_subtitles',
        'video_no_subtitles',
        'audio_only',
    ];

    public function index(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureCanUseEditor($user, $organization);

        $perPage = max(1, min(50, (int) $request->integer('per_page', 12)));

        $projects = EditorProject::query()
            ->where('organization_id', $organization->id)
            ->where('owner_user_id', $user->id)
            ->withCount(['assets', 'subtitles', 'comments', 'renders'])
            ->latest()
            ->paginate($perPage);

        $projects->setCollection(
            $projects->getCollection()->map(
                fn (EditorProject $project): array => $this->transformProjectSummary($project, $user)
            )
        );

        return response()->json($projects);
    }

    public function mine(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        if (! $user) {
            abort(401, 'Não autenticado.');
        }

        $perPage = max(1, min(50, (int) $request->integer('per_page', 30)));

        $projects = EditorProject::query()
            ->where('owner_user_id', $user->id)
            ->whereHas('organization.members', fn ($builder) => $builder
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->with('organization:id,name,slug,avatar_path')
            ->withCount(['assets', 'subtitles', 'comments', 'renders'])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $projects->setCollection(
            $projects->getCollection()->map(
                fn (EditorProject $project): array => $this->transformProjectSummary($project, $user, true)
            )
        );

        return response()->json($projects);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureCanUseEditor($user, $organization);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'source_language' => ['nullable', 'string', 'max:10'],
            'target_language' => ['nullable', 'string', 'max:10'],
        ]);

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $user->id,
            'title' => trim($validated['title']),
            'description' => isset($validated['description']) ? trim((string) $validated['description']) : null,
            'source_language' => $validated['source_language'] ?? 'ja',
            'target_language' => $validated['target_language'] ?? 'pt-BR',
            'status' => 'draft',
            'timeline_json' => [
                'video_clips' => [],
                'audio_clips' => [],
                'subtitle_clips' => [],
            ],
            'storage_bytes' => 0,
            'autosaved_at' => now(),
        ]);

        $this->recordProjectEvent($project->id, $user->id, 'project_created', [
            'title' => $project->title,
        ]);

        AuditTrail::record(
            'editor_project_created',
            $project,
            $user->id,
            $organization->id,
            null,
            $project->toArray(),
            null,
            $request,
        );

        return response()->json([
            'message' => 'Projeto de edição criado com sucesso.',
            'project' => $this->transformProject($project->fresh(['organization', 'owner', 'assets', 'subtitles', 'comments.user', 'renders']), $user),
        ], 201);
    }

    public function show(Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        $editorProject->load([
            'organization:id,name,slug,avatar_path',
            'owner:id,name,stage_name,username,avatar_path',
            'assets',
            'subtitles',
            'comments.user:id,name,stage_name,username,avatar_path',
            'renders',
        ]);

        return response()->json([
            'project' => $this->transformProject($editorProject, $user),
        ]);
    }

    public function update(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'source_language' => ['sometimes', 'string', 'max:10'],
            'target_language' => ['sometimes', 'string', 'max:10'],
        ]);

        $before = $editorProject->toArray();

        if (array_key_exists('title', $validated)) {
            $title = trim((string) $validated['title']);
            if ($title === '') {
                abort(422, 'Informe um título válido para o projeto.');
            }
            $editorProject->title = $title;
        }
        if (array_key_exists('description', $validated)) {
            $description = trim((string) ($validated['description'] ?? ''));
            $editorProject->description = $description === '' ? null : $description;
        }
        if (array_key_exists('source_language', $validated)) {
            $editorProject->source_language = (string) $validated['source_language'];
        }
        if (array_key_exists('target_language', $validated)) {
            $editorProject->target_language = (string) $validated['target_language'];
        }

        $editorProject->save();

        $this->recordProjectEvent($editorProject->id, $user->id, 'project_updated', [
            'fields' => array_keys($validated),
        ]);

        AuditTrail::record(
            'editor_project_updated',
            $editorProject,
            $user->id,
            $organization->id,
            $before,
            $editorProject->fresh()->toArray(),
            null,
            $request,
        );

        return response()->json([
            'message' => 'Projeto atualizado.',
            'project' => $this->transformProject($editorProject->fresh(['organization', 'owner', 'assets', 'subtitles', 'comments.user', 'renders']), $user),
        ]);
    }

    public function destroy(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        $validated = $request->validate([
            'confirmation_phrase' => ['required', 'string', 'max:500'],
        ]);

        $expectedPhrase = $this->buildProjectDeletionPhrase($user, $editorProject);
        if (trim((string) $validated['confirmation_phrase']) !== $expectedPhrase) {
            abort(422, 'Frase de confirmação inválida. Copie exatamente a frase exigida.');
        }

        $before = $editorProject->toArray();
        $this->deleteProjectFiles($editorProject);
        $editorProject->delete();

        $this->recordProjectEvent($editorProject->id, $user->id, 'project_deleted', null);

        AuditTrail::record(
            'editor_project_deleted',
            $editorProject,
            $user->id,
            $organization->id,
            $before,
            null,
            null,
            $request,
        );

        return response()->json([
            'message' => 'Projeto removido com sucesso.',
        ]);
    }

    public function autosave(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        $validated = $request->validate([
            'timeline_json' => ['required', 'array'],
            'timeline_json.video_clips' => ['sometimes', 'array', 'max:2000'],
            'timeline_json.video_clips.*.asset_id' => ['required_with:timeline_json.video_clips', 'integer', 'exists:editor_project_assets,id'],
            'timeline_json.video_clips.*.source_in_ms' => ['required_with:timeline_json.video_clips', 'integer', 'min:0', 'max:21600000'],
            'timeline_json.video_clips.*.source_out_ms' => ['required_with:timeline_json.video_clips', 'integer', 'min:1', 'max:21600000'],
            'timeline_json.video_clips.*.timeline_start_ms' => ['required_with:timeline_json.video_clips', 'integer', 'min:0', 'max:21600000'],
            'timeline_json.video_clips.*.volume_gain' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'timeline_json.audio_clips' => ['sometimes', 'array', 'max:2000'],
            'timeline_json.audio_clips.*.asset_id' => ['required_with:timeline_json.audio_clips', 'integer', 'exists:editor_project_assets,id'],
            'timeline_json.audio_clips.*.source_in_ms' => ['required_with:timeline_json.audio_clips', 'integer', 'min:0', 'max:21600000'],
            'timeline_json.audio_clips.*.source_out_ms' => ['required_with:timeline_json.audio_clips', 'integer', 'min:1', 'max:21600000'],
            'timeline_json.audio_clips.*.timeline_start_ms' => ['required_with:timeline_json.audio_clips', 'integer', 'min:0', 'max:21600000'],
            'timeline_json.audio_clips.*.volume_gain' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'timeline_json.subtitle_clips' => ['nullable', 'array', 'max:2000'],
            'duration_ms' => ['nullable', 'integer', 'min:0', 'max:21600000'],
            'subtitles' => ['nullable', 'array'],
            'subtitles.*.id' => ['nullable', 'integer', 'exists:editor_project_subtitles,id'],
            'subtitles.*.language_code' => ['required_with:subtitles', 'string', 'max:10'],
            'subtitles.*.start_ms' => ['required_with:subtitles', 'integer', 'min:0', 'max:21600000'],
            'subtitles.*.end_ms' => ['required_with:subtitles', 'integer', 'min:1', 'max:21600000'],
            'subtitles.*.text' => ['required_with:subtitles', 'string', 'max:500'],
            'subtitles.*.style_json' => ['nullable', 'array'],
        ]);

        $timelineInput = is_array($validated['timeline_json'] ?? null) ? $validated['timeline_json'] : [];
        $normalizedTimeline = [
            'video_clips' => is_array($timelineInput['video_clips'] ?? null) ? array_values($timelineInput['video_clips']) : [],
            'audio_clips' => is_array($timelineInput['audio_clips'] ?? null) ? array_values($timelineInput['audio_clips']) : [],
            'subtitle_clips' => is_array($timelineInput['subtitle_clips'] ?? null) ? array_values($timelineInput['subtitle_clips']) : [],
        ];

        $this->validateTimelinePayload($editorProject, $normalizedTimeline);

        $editorProject->forceFill([
            'timeline_json' => $normalizedTimeline,
            'duration_ms' => $validated['duration_ms'] ?? $editorProject->duration_ms,
            'autosaved_at' => now(),
        ])->save();

        if (array_key_exists('subtitles', $validated) && is_array($validated['subtitles'])) {
            $this->syncSubtitles($editorProject->id, $validated['subtitles']);
        }

        $this->recordProjectEvent($editorProject->id, $user->id, 'project_autosaved', [
            'duration_ms' => $editorProject->duration_ms,
        ]);

        AuditTrail::record(
            'editor_project_autosaved',
            $editorProject,
            $user->id,
            $organization->id,
            null,
            ['autosaved_at' => optional($editorProject->autosaved_at)->toIso8601String()],
            null,
            $request,
        );

        return response()->json([
            'message' => 'Autosave concluído.',
            'autosaved_at' => optional($editorProject->autosaved_at)->toIso8601String(),
            'project' => $this->transformProject($editorProject->fresh(['organization', 'owner', 'assets', 'subtitles', 'comments.user', 'renders']), $user),
        ]);
    }

    public function uploadAssets(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        $allMimes = array_merge(
            config('editor.allowed_video_mimes', []),
            config('editor.allowed_audio_mimes', [])
        );

        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:12'],
            'files.*' => [
                'file',
                'max:'.(int) config('editor.max_asset_size_kb', 2097152),
                'mimetypes:'.implode(',', $allMimes),
            ],
        ]);

        $files = collect($request->file('files', []))
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->values();

        if ($files->isEmpty()) {
            abort(422, 'Envie ao menos um arquivo válido.');
        }

        $incomingSize = $files->sum(static fn (UploadedFile $file): int => (int) ($file->getSize() ?? 0));
        $projectStorage = (int) $editorProject->assets()->sum('size_bytes');
        $maxStorage = (int) config('editor.max_project_size_bytes', 5 * 1024 * 1024 * 1024);
        if ($projectStorage + $incomingSize > $maxStorage) {
            abort(422, 'Este projeto excede o limite total de 5 GB de mídia.');
        }

        $lastSortOrder = (int) $editorProject->assets()->max('sort_order');

        $createdAssets = DB::transaction(function () use ($files, $editorProject, $lastSortOrder): array {
            $created = [];
            foreach ($files as $index => $file) {
                $path = $file->store("editor-projects/{$editorProject->id}/assets", 'local');
                $asset = EditorProjectAsset::query()->create([
                    'project_id' => $editorProject->id,
                    'asset_type' => $this->resolveAssetType($file),
                    'label' => $file->getClientOriginalName(),
                    'path' => $path,
                    'disk' => 'local',
                    'mime' => $file->getMimeType(),
                    'size_bytes' => (int) ($file->getSize() ?? 0),
                    'sort_order' => $lastSortOrder + $index + 1,
                ]);

                $created[] = $asset;
            }

            $editorProject->storage_bytes = (int) $editorProject->assets()->sum('size_bytes');
            $editorProject->save();

            return $created;
        });

        foreach ($createdAssets as $asset) {
            ProcessEditorAssetJob::dispatch($asset->id);
        }

        $this->recordProjectEvent($editorProject->id, $user->id, 'assets_uploaded', [
            'assets_count' => count($createdAssets),
            'bytes' => $incomingSize,
        ]);

        AuditTrail::record(
            'editor_assets_uploaded',
            $editorProject,
            $user->id,
            $organization->id,
            null,
            ['assets_count' => count($createdAssets)],
            null,
            $request,
        );

        return response()->json([
            'message' => 'Arquivos enviados com sucesso. Processando metadados...',
            'project' => $this->transformProject($editorProject->fresh(['organization', 'owner', 'assets', 'subtitles', 'comments.user', 'renders']), $user),
        ], 201);
    }

    public function destroyAsset(Request $request, Organization $organization, EditorProject $editorProject, EditorProjectAsset $asset): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);
        $this->ensureAssetBelongsToProject($asset, $editorProject);

        $paths = array_filter([$asset->path, $asset->waveform_path, $asset->thumbnail_path, $asset->preview_frame_path]);
        if ($paths !== []) {
            Storage::disk($asset->disk ?: 'local')->delete($paths);
        }

        $asset->delete();
        $editorProject->storage_bytes = (int) $editorProject->assets()->sum('size_bytes');
        $editorProject->save();

        $this->recordProjectEvent($editorProject->id, $user->id, 'asset_removed', [
            'asset_id' => $asset->id,
        ]);

        AuditTrail::record(
            'editor_asset_removed',
            $editorProject,
            $user->id,
            $organization->id,
            null,
            ['asset_id' => $asset->id],
            null,
            $request,
        );

        return response()->json([
            'message' => 'Arquivo removido do projeto.',
            'project' => $this->transformProject($editorProject->fresh(['organization', 'owner', 'assets', 'subtitles', 'comments.user', 'renders']), $user),
        ]);
    }

    public function upsertSubtitle(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        $validated = $request->validate([
            'id' => ['nullable', 'integer', 'exists:editor_project_subtitles,id'],
            'language_code' => ['required', 'string', 'max:10'],
            'start_ms' => ['required', 'integer', 'min:0', 'max:21600000'],
            'end_ms' => ['required', 'integer', 'min:1', 'max:21600000'],
            'text' => ['required', 'string', 'max:500'],
            'style_json' => ['nullable', 'array'],
        ]);

        if ((int) $validated['end_ms'] <= (int) $validated['start_ms']) {
            abort(422, 'A legenda deve terminar após o início.');
        }

        $subtitle = null;
        if (! empty($validated['id'])) {
            $subtitle = EditorProjectSubtitle::query()->findOrFail((int) $validated['id']);
            if ((int) $subtitle->project_id !== (int) $editorProject->id) {
                abort(403, 'Legenda não pertence a este projeto.');
            }
        } else {
            $subtitle = new EditorProjectSubtitle([
                'project_id' => $editorProject->id,
                'sort_order' => (int) $editorProject->subtitles()->max('sort_order') + 1,
            ]);
        }

        $subtitle->forceFill([
            'language_code' => $validated['language_code'],
            'start_ms' => (int) $validated['start_ms'],
            'end_ms' => (int) $validated['end_ms'],
            'text' => trim((string) $validated['text']),
            'style_json' => $validated['style_json'] ?? null,
        ])->save();

        $this->recordProjectEvent($editorProject->id, $user->id, 'subtitle_upserted', [
            'subtitle_id' => $subtitle->id,
        ]);

        return response()->json([
            'message' => 'Legenda salva.',
            'subtitle' => $this->transformSubtitle($subtitle),
        ]);
    }

    public function destroySubtitle(Organization $organization, EditorProject $editorProject, EditorProjectSubtitle $subtitle): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        if ((int) $subtitle->project_id !== (int) $editorProject->id) {
            abort(403, 'Legenda não pertence a este projeto.');
        }

        $subtitle->delete();

        $this->recordProjectEvent($editorProject->id, $user->id, 'subtitle_deleted', [
            'subtitle_id' => $subtitle->id,
        ]);

        return response()->json([
            'message' => 'Legenda removida.',
        ]);
    }

    public function comments(Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        $comments = $editorProject->comments()
            ->with('user:id,name,stage_name,username,avatar_path')
            ->latest('created_at')
            ->get()
            ->map(fn (EditorProjectComment $comment): array => $this->transformComment($comment))
            ->values();

        return response()->json([
            'items' => $comments,
        ]);
    }

    public function storeComment(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        $validated = $request->validate([
            'timestamp_ms' => ['required', 'integer', 'min:0', 'max:21600000'],
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $comment = EditorProjectComment::query()->create([
            'project_id' => $editorProject->id,
            'user_id' => $user->id,
            'timestamp_ms' => (int) $validated['timestamp_ms'],
            'body' => trim((string) $validated['body']),
        ]);

        $comment->load('user:id,name,stage_name,username,avatar_path');

        $this->recordProjectEvent($editorProject->id, $user->id, 'comment_added', [
            'comment_id' => $comment->id,
        ]);

        return response()->json([
            'message' => 'Comentário adicionado.',
            'comment' => $this->transformComment($comment),
        ], 201);
    }

    public function destroyComment(Organization $organization, EditorProject $editorProject, EditorProjectComment $comment): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);
        $this->ensureProjectEditable($editorProject);

        if ((int) $comment->project_id !== (int) $editorProject->id) {
            abort(403, 'Comentário não pertence a este projeto.');
        }

        $comment->delete();

        $this->recordProjectEvent($editorProject->id, $user->id, 'comment_deleted', [
            'comment_id' => $comment->id,
        ]);

        return response()->json([
            'message' => 'Comentário removido.',
        ]);
    }

    public function queueRender(Request $request, Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        $validated = $request->validate([
            'preset' => ['required', Rule::in(self::RENDER_PRESETS)],
            'output_mode' => ['required', Rule::in(self::OUTPUT_MODES)],
        ]);

        [$editorProject, $render] = DB::transaction(function () use ($editorProject, $user, $validated): array {
            /** @var EditorProject|null $lockedProject */
            $lockedProject = EditorProject::query()
                ->whereKey($editorProject->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedProject) {
                abort(404);
            }

            if ($lockedProject->source_assets_purged_at !== null) {
                abort(422, 'Este projeto já foi finalizado e os arquivos de origem foram removidos. Crie um novo projeto para nova renderização.');
            }

            $pendingRenderExists = EditorProjectRender::query()
                ->where('project_id', $lockedProject->id)
                ->whereIn('status', ['queued', 'processing'])
                ->exists();

            if ($pendingRenderExists || $lockedProject->status === 'rendering') {
                abort(422, 'Já existe uma renderização em andamento para este projeto. Aguarde finalizar para iniciar outra.');
            }

            if ($lockedProject->assets()->whereIn('asset_type', ['video', 'image'])->count() === 0) {
                abort(422, 'Adicione ao menos um vídeo ou imagem para renderizar.');
            }

            $createdRender = EditorProjectRender::query()->create([
                'project_id' => $lockedProject->id,
                'requested_by_user_id' => $user->id,
                'status' => 'queued',
                'progress_percent' => 0,
                'preset' => $validated['preset'],
                'output_mode' => $validated['output_mode'],
            ]);

            $lockedProject->status = 'rendering';
            $lockedProject->save();

            return [$lockedProject, $createdRender];
        });

        $this->recordProjectEvent($editorProject->id, $user->id, 'render_queued', [
            'render_id' => $render->id,
            'preset' => $render->preset,
            'output_mode' => $render->output_mode,
        ]);

        AuditTrail::record(
            'editor_render_queued',
            $editorProject,
            $user->id,
            $organization->id,
            null,
            ['render_id' => $render->id, 'preset' => $render->preset, 'output_mode' => $render->output_mode],
            null,
            $request,
        );

        RenderEditorProjectJob::dispatch($editorProject->id, $render->id);

        return response()->json([
            'message' => 'Renderização enviada para fila.',
            'render' => $this->transformRender($render),
        ], 202);
    }

    public function renders(Organization $organization, EditorProject $editorProject): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        $renders = $editorProject->renders()
            ->latest('created_at')
            ->get()
            ->map(fn (EditorProjectRender $render): array => $this->transformRender($render))
            ->values();

        return response()->json([
            'items' => $renders,
        ]);
    }

    public function showRender(Organization $organization, EditorProject $editorProject, EditorProjectRender $render): JsonResponse
    {
        $user = auth('api')->user();
        $this->ensureProjectOwner($user, $organization, $editorProject);

        if ((int) $render->project_id !== (int) $editorProject->id) {
            abort(403, 'Render não pertence a este projeto.');
        }

        return response()->json([
            'render' => $this->transformRender($render),
        ]);
    }

    private function ensureCanUseEditor(?User $user, Organization $organization): void
    {
        if (! $user) {
            abort(401, 'Não autenticado.');
        }

        if (! OrganizationAccess::canUseEditor($user, $organization)) {
            abort(403, 'Sem permissão para usar o editor nesta comunidade.');
        }
    }

    private function ensureProjectOwner(?User $user, Organization $organization, EditorProject $editorProject): void
    {
        if (! $user) {
            abort(401, 'Não autenticado.');
        }

        if ((int) $editorProject->organization_id !== (int) $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canUseEditor($user, $organization)) {
            abort(403, 'Sem permissão para usar o editor nesta comunidade.');
        }

        if ((int) $editorProject->owner_user_id !== (int) $user->id) {
            abort(403, 'Somente o dono deste projeto pode acessá-lo.');
        }
    }

    private function ensureAssetBelongsToProject(EditorProjectAsset $asset, EditorProject $project): void
    {
        if ((int) $asset->project_id !== (int) $project->id) {
            abort(403, 'Arquivo não pertence a este projeto.');
        }
    }

    private function ensureProjectEditable(EditorProject $project): void
    {
        if ($project->source_assets_purged_at !== null) {
            abort(422, 'Este projeto já foi finalizado e os arquivos de origem foram removidos. Crie um novo projeto para continuar editando.');
        }
    }

    private function resolveAssetType(UploadedFile $file): string
    {
        $mime = strtolower((string) ($file->getMimeType() ?? ''));
        $extension = strtolower((string) $file->getClientOriginalExtension());

        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }

        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }

        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }

        if (in_array($extension, ['srt', 'vtt'], true)) {
            return 'subtitle';
        }

        return 'subtitle';
    }

    /**
     * @param  array<string, mixed>  $timeline
     */
    private function validateTimelinePayload(EditorProject $project, array $timeline): void
    {
        $assetsById = $project->assets()
            ->get(['id', 'asset_type'])
            ->keyBy('id');

        /** @var array<int, mixed> $videoClips */
        $videoClips = is_array($timeline['video_clips'] ?? null) ? $timeline['video_clips'] : [];
        /** @var array<int, mixed> $audioClips */
        $audioClips = is_array($timeline['audio_clips'] ?? null) ? $timeline['audio_clips'] : [];

        $validateTrack = function (array $clips, string $trackLabel, array $allowedTypes) use ($assetsById): void {
            foreach ($clips as $index => $clip) {
                if (! is_array($clip)) {
                    abort(422, "Clipe inválido na faixa {$trackLabel}.");
                }

                $assetId = (int) ($clip['asset_id'] ?? 0);
                $asset = $assetsById->get($assetId);
                if (! $asset) {
                    abort(422, "O arquivo do clipe #".($index + 1)." da faixa {$trackLabel} não pertence a este projeto.");
                }

                if (! in_array($asset->asset_type, $allowedTypes, true)) {
                    abort(422, "Tipo de arquivo inválido para o clipe #".($index + 1)." da faixa {$trackLabel}.");
                }

                $sourceInMs = max(0, (int) ($clip['source_in_ms'] ?? 0));
                $sourceOutMs = max(0, (int) ($clip['source_out_ms'] ?? 0));
                if ($sourceOutMs <= $sourceInMs) {
                    abort(422, "O clipe #".($index + 1)." da faixa {$trackLabel} precisa terminar após o início.");
                }
            }
        };

        $validateTrack($videoClips, 'de vídeo', ['video', 'image']);
        $validateTrack($audioClips, 'de áudio', ['audio', 'video']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $subtitles
     */
    private function syncSubtitles(int $projectId, array $subtitles): void
    {
        $keepIds = [];

        foreach ($subtitles as $index => $subtitleInput) {
            if (! is_array($subtitleInput)) {
                continue;
            }

            $subtitleId = isset($subtitleInput['id']) ? (int) $subtitleInput['id'] : null;
            $startMs = max(0, (int) ($subtitleInput['start_ms'] ?? 0));
            $endMs = max($startMs + 1, (int) ($subtitleInput['end_ms'] ?? ($startMs + 1000)));

            $model = null;
            if ($subtitleId) {
                $model = EditorProjectSubtitle::query()
                    ->where('project_id', $projectId)
                    ->where('id', $subtitleId)
                    ->first();
            }

            if (! $model) {
                $model = new EditorProjectSubtitle([
                    'project_id' => $projectId,
                ]);
            }

            $model->forceFill([
                'language_code' => (string) ($subtitleInput['language_code'] ?? 'pt-BR'),
                'start_ms' => $startMs,
                'end_ms' => $endMs,
                'text' => trim((string) ($subtitleInput['text'] ?? '')),
                'style_json' => is_array($subtitleInput['style_json'] ?? null) ? $subtitleInput['style_json'] : null,
                'sort_order' => $index + 1,
            ])->save();

            $keepIds[] = (int) $model->id;
        }

        if ($keepIds !== []) {
            EditorProjectSubtitle::query()
                ->where('project_id', $projectId)
                ->whereNotIn('id', $keepIds)
                ->delete();
        } else {
            EditorProjectSubtitle::query()->where('project_id', $projectId)->delete();
        }
    }

    private function deleteProjectFiles(EditorProject $project): void
    {
        $assets = $project->assets()->get();
        foreach ($assets as $asset) {
            $disk = $asset->disk ?: 'local';
            $paths = array_filter([$asset->path, $asset->waveform_path, $asset->thumbnail_path, $asset->preview_frame_path]);
            if ($paths !== []) {
                Storage::disk($disk)->delete($paths);
            }
        }

        $renders = $project->renders()->get();
        foreach ($renders as $render) {
            if (is_string($render->output_path) && trim($render->output_path) !== '') {
                Storage::disk($render->output_disk ?: 'local')->delete($render->output_path);
            }
        }
    }

    private function recordProjectEvent(int $projectId, ?int $userId, string $eventType, ?array $payload): void
    {
        EditorProjectEvent::query()->create([
            'project_id' => $projectId,
            'user_id' => $userId,
            'event_type' => $eventType,
            'payload_json' => $payload,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformProject(EditorProject $project, ?User $viewer = null): array
    {
        return [
            'id' => $project->id,
            'organization_id' => $project->organization_id,
            'owner_user_id' => $project->owner_user_id,
            'title' => $project->title,
            'description' => $project->description,
            'source_language' => $project->source_language,
            'target_language' => $project->target_language,
            'status' => $project->status,
            'timeline_json' => is_array($project->timeline_json) ? $project->timeline_json : null,
            'storage_bytes' => (int) $project->storage_bytes,
            'duration_ms' => $project->duration_ms,
            'autosaved_at' => optional($project->autosaved_at)->toIso8601String(),
            'rendered_at' => optional($project->rendered_at)->toIso8601String(),
            'source_assets_purged_at' => optional($project->source_assets_purged_at)->toIso8601String(),
            'required_delete_phrase' => $viewer ? $this->buildProjectDeletionPhrase($viewer, $project) : null,
            'created_at' => optional($project->created_at)->toIso8601String(),
            'updated_at' => optional($project->updated_at)->toIso8601String(),
            'organization' => $project->relationLoaded('organization') ? [
                'id' => $project->organization?->id,
                'name' => $project->organization?->name,
                'slug' => $project->organization?->slug,
                'avatar_path' => $project->organization?->avatar_path,
            ] : null,
            'owner' => $project->relationLoaded('owner') ? [
                'id' => $project->owner?->id,
                'name' => $project->owner?->name,
                'stage_name' => $project->owner?->stage_name,
                'username' => $project->owner?->username,
                'avatar_path' => $project->owner?->avatar_path,
            ] : null,
            'assets' => $project->relationLoaded('assets')
                ? $project->assets->map(fn (EditorProjectAsset $asset): array => $this->transformAsset($asset))->values()->all()
                : [],
            'subtitles' => $project->relationLoaded('subtitles')
                ? $project->subtitles->map(fn (EditorProjectSubtitle $subtitle): array => $this->transformSubtitle($subtitle))->values()->all()
                : [],
            'comments' => $project->relationLoaded('comments')
                ? $project->comments->map(fn (EditorProjectComment $comment): array => $this->transformComment($comment))->values()->all()
                : [],
            'renders' => $project->relationLoaded('renders')
                ? $project->renders->map(fn (EditorProjectRender $render): array => $this->transformRender($render))->values()->all()
                : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformProjectSummary(EditorProject $project, User $viewer, bool $includeOrganization = false): array
    {
        return [
            'id' => $project->id,
            'organization_id' => $project->organization_id,
            'owner_user_id' => $project->owner_user_id,
            'title' => $project->title,
            'status' => $project->status,
            'required_delete_phrase' => $this->buildProjectDeletionPhrase($viewer, $project),
            'assets_count' => (int) ($project->assets_count ?? 0),
            'subtitles_count' => (int) ($project->subtitles_count ?? 0),
            'comments_count' => (int) ($project->comments_count ?? 0),
            'renders_count' => (int) ($project->renders_count ?? 0),
            'created_at' => optional($project->created_at)->toIso8601String(),
            'updated_at' => optional($project->updated_at)->toIso8601String(),
            'organization' => $includeOrganization && $project->relationLoaded('organization') ? [
                'id' => $project->organization?->id,
                'name' => $project->organization?->name,
                'slug' => $project->organization?->slug,
                'avatar_path' => $project->organization?->avatar_path,
            ] : null,
        ];
    }

    private function buildProjectDeletionPhrase(User $user, EditorProject $project): string
    {
        $displayName = trim((string) ($user->stage_name ?: $user->name));
        $projectTitle = trim((string) $project->title);

        return sprintf('Eu usuário %s desejo deletar o projeto %s', $displayName, $projectTitle);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformAsset(EditorProjectAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'project_id' => $asset->project_id,
            'asset_type' => $asset->asset_type,
            'label' => $asset->label,
            'path' => MediaAccess::signPath($asset->path),
            'mime' => $asset->mime,
            'size_bytes' => (int) $asset->size_bytes,
            'duration_ms' => $asset->duration_ms,
            'video_width' => $asset->video_width,
            'video_height' => $asset->video_height,
            'fps' => $asset->fps,
            'sample_rate' => $asset->sample_rate,
            'channels' => $asset->channels,
            'waveform_path' => MediaAccess::signPath($asset->waveform_path),
            'thumbnail_path' => MediaAccess::signPath($asset->thumbnail_path),
            'preview_frame_path' => MediaAccess::signPath($asset->preview_frame_path),
            'metadata_json' => $asset->metadata_json,
            'sort_order' => $asset->sort_order,
            'processed_at' => optional($asset->processed_at)->toIso8601String(),
            'created_at' => optional($asset->created_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSubtitle(EditorProjectSubtitle $subtitle): array
    {
        return [
            'id' => $subtitle->id,
            'project_id' => $subtitle->project_id,
            'language_code' => $subtitle->language_code,
            'start_ms' => (int) $subtitle->start_ms,
            'end_ms' => (int) $subtitle->end_ms,
            'text' => $subtitle->text,
            'style_json' => $subtitle->style_json,
            'sort_order' => (int) $subtitle->sort_order,
            'created_at' => optional($subtitle->created_at)->toIso8601String(),
            'updated_at' => optional($subtitle->updated_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformComment(EditorProjectComment $comment): array
    {
        return [
            'id' => $comment->id,
            'project_id' => $comment->project_id,
            'user_id' => $comment->user_id,
            'timestamp_ms' => (int) $comment->timestamp_ms,
            'body' => $comment->body,
            'resolved_at' => optional($comment->resolved_at)->toIso8601String(),
            'created_at' => optional($comment->created_at)->toIso8601String(),
            'user' => $comment->relationLoaded('user') ? [
                'id' => $comment->user?->id,
                'name' => $comment->user?->name,
                'stage_name' => $comment->user?->stage_name,
                'username' => $comment->user?->username,
                'avatar_path' => $comment->user?->avatar_path,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRender(EditorProjectRender $render): array
    {
        return [
            'id' => $render->id,
            'project_id' => $render->project_id,
            'requested_by_user_id' => $render->requested_by_user_id,
            'status' => $render->status,
            'progress_percent' => (int) $render->progress_percent,
            'preset' => $render->preset,
            'output_mode' => $render->output_mode,
            'output_path' => MediaAccess::signPath($render->output_path),
            'output_size_bytes' => $render->output_size_bytes,
            'error_message' => $render->error_message,
            'started_at' => optional($render->started_at)->toIso8601String(),
            'finished_at' => optional($render->finished_at)->toIso8601String(),
            'created_at' => optional($render->created_at)->toIso8601String(),
        ];
    }
}
