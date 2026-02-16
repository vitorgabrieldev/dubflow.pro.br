<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingTest;
use App\Models\DubbingTestCharacter;
use App\Models\DubbingTestMedia;
use App\Models\DubbingTestSubmission;
use App\Models\DubbingTestSubmissionMedia;
use App\Notifications\DubbingTestResultReleased;
use App\Models\Organization;
use App\Models\User;
use App\Support\AchievementEngine;
use App\Support\AuditTrail;
use App\Support\MediaAccess;
use App\Support\OrganizationAccess;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DubbingTestController extends Controller
{
    private const MAX_MEDIA_FILE_SIZE_KB = 1048576; // 1 GB

    /**
     * @var array<int, string>
     */
    private const APPEARANCE_ESTIMATES = [
        'protagonista',
        'coadjuvante',
        'pontas',
        'figurante',
        'voz_adicional',
    ];

    /**
     * @var array<int, string>
     */
    private const ALLOWED_MEDIA_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav',
        'audio/x-wav',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
        'audio/webm',
    ];

    public function opportunities(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = DubbingTest::query()
            ->where('status', 'published')
            ->where('ends_at', '>=', now())
            ->with([
                'organization:id,name,slug,avatar_path',
                'characters:id,dubbing_test_id,name,appearance_estimate',
                'media:id,dubbing_test_id,media_path,media_type,sort_order',
            ])
            ->withCount(['characters', 'submissions'])
            ->latest('created_at');

        $visibility = $request->string('visibility')->toString();
        if ($visibility !== '') {
            $query->where('visibility', $visibility);
        }

        $term = trim($request->string('q')->toString());
        if ($term !== '') {
            $query->where(function ($builder) use ($term): void {
                $builder->where('title', 'like', '%'.$term.'%')
                    ->orWhereHas('organization', fn ($organizationBuilder) => $organizationBuilder->where('name', 'like', '%'.$term.'%'))
                    ->orWhereHas('characters', fn ($charactersBuilder) => $charactersBuilder->where('name', 'like', '%'.$term.'%'));
            });
        }

        $appearance = $request->string('appearance')->toString();
        if ($appearance !== '') {
            $query->whereHas('characters', fn ($builder) => $builder->where('appearance_estimate', $appearance));
        }

        if ($user instanceof User) {
            $query->where(function ($builder) use ($user): void {
                $builder->where('visibility', 'external')
                    ->orWhere(function ($internalBuilder) use ($user): void {
                        $internalBuilder->where('visibility', 'internal')
                            ->whereHas('organization.members', fn ($membersBuilder) => $membersBuilder
                                ->where('user_id', $user->id)
                                ->where('status', 'active'));
                    });
            });
        } else {
            $query->where('visibility', 'external');
        }

        $tests = $query->paginate((int) $request->integer('per_page', 12));

        $tests->getCollection()->each(function (DubbingTest $dubbingTest): void {
            $dubbingTest->media->each(function (DubbingTestMedia $media): void {
                $media->media_path = MediaAccess::signPath($media->media_path);
            });
        });

        return response()->json($tests);
    }

    public function organizationTests(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();
        $canManage = $user ? OrganizationAccess::canManageOrganization($user, $organization) : false;

        $query = DubbingTest::query()
            ->where('organization_id', $organization->id)
            ->with([
                'organization:id,name,slug,avatar_path',
                'characters:id,dubbing_test_id,name,appearance_estimate',
                'media:id,dubbing_test_id,media_path,media_type,sort_order',
            ])
            ->withCount(['characters', 'submissions'])
            ->latest('created_at');

        if (! $canManage) {
            $query->where('visibility', 'external')
                ->whereIn('status', ['published', 'closed', 'results_released']);
        }

        $tests = $query->paginate((int) $request->integer('per_page', 3));

        $tests->getCollection()->each(function (DubbingTest $dubbingTest): void {
            $dubbingTest->media->each(function (DubbingTestMedia $media): void {
                $media->media_path = MediaAccess::signPath($media->media_path);
            });
        });

        return response()->json($tests);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para criar teste de dublagem.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'visibility' => ['required', 'in:internal,external'],
            'status' => ['sometimes', 'in:draft,published,closed,archived'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'results_release_at' => ['required', 'date', 'after_or_equal:ends_at'],
            'characters' => ['required', 'array', 'min:1'],
            'characters.*.name' => ['required', 'string', 'max:255'],
            'characters.*.description' => ['nullable', 'string', 'max:3000'],
            'characters.*.expectations' => ['nullable', 'string', 'max:3000'],
            'characters.*.appearance_estimate' => ['required', 'in:'.implode(',', self::APPEARANCE_ESTIMATES)],
            'media' => ['nullable', 'array'],
            'media.*' => $this->mediaFileRules(),
        ]);

        $dubbingTest = DB::transaction(function () use ($validated, $organization, $user, $request): DubbingTest {
            $dubbingTest = DubbingTest::create([
                'organization_id' => $organization->id,
                'created_by_user_id' => $user->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'visibility' => $validated['visibility'],
                'status' => $validated['status'] ?? 'published',
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'],
                'results_release_at' => $validated['results_release_at'],
            ]);

            foreach ($validated['characters'] as $index => $characterInput) {
                DubbingTestCharacter::create([
                    'dubbing_test_id' => $dubbingTest->id,
                    'name' => $characterInput['name'],
                    'description' => $characterInput['description'] ?? null,
                    'expectations' => $characterInput['expectations'] ?? null,
                    'appearance_estimate' => $characterInput['appearance_estimate'],
                    'position' => $index,
                ]);
            }

            foreach ($request->file('media', []) as $index => $mediaFile) {
                $path = $mediaFile->store('dubbing-tests/'.$dubbingTest->id.'/brief', 'local');

                DubbingTestMedia::create([
                    'dubbing_test_id' => $dubbingTest->id,
                    'media_path' => $path,
                    'media_type' => $this->resolveMediaType($mediaFile->getMimeType()),
                    'disk' => 'local',
                    'size_bytes' => (int) $mediaFile->getSize(),
                    'sort_order' => $index,
                ]);
            }

            AuditTrail::record(
                'dubbing_test_created',
                $dubbingTest,
                $user->id,
                $organization->id,
                null,
                $dubbingTest->toArray(),
                ['characters_count' => count($validated['characters'])],
                $request,
            );

            return $dubbingTest;
        });

        $dubbingTest->load(['organization:id,name,slug', 'characters', 'media']);
        $dubbingTest->media->each(fn (DubbingTestMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));
        app(AchievementEngine::class)->onDubbingTestCreated($dubbingTest);

        return response()->json([
            'message' => 'Teste de dublagem criado com sucesso.',
            'dubbing_test' => $dubbingTest,
        ], 201);
    }

    public function update(Request $request, Organization $organization, DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para editar teste de dublagem.');
        }

        if ($dubbingTest->status === 'results_released') {
            abort(422, 'Teste finalizado. Não é possível editar após concluir a seleção.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'visibility' => ['sometimes', 'in:internal,external'],
            'status' => ['sometimes', 'in:draft,published,closed,results_released,archived'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date'],
            'results_release_at' => ['sometimes', 'date'],
            'characters' => ['sometimes', 'array', 'min:1'],
            'characters.*.name' => ['required_with:characters', 'string', 'max:255'],
            'characters.*.description' => ['nullable', 'string', 'max:3000'],
            'characters.*.expectations' => ['nullable', 'string', 'max:3000'],
            'characters.*.appearance_estimate' => ['required_with:characters', 'in:'.implode(',', self::APPEARANCE_ESTIMATES)],
            'media' => ['nullable', 'array'],
            'media.*' => $this->mediaFileRules(),
            'remove_media_ids' => ['nullable', 'array'],
            'remove_media_ids.*' => ['integer'],
        ]);

        if (($validated['status'] ?? null) === 'results_released') {
            abort(422, 'Use "Concluir seleção" para finalizar e liberar os resultados.');
        }

        $startsAt = array_key_exists('starts_at', $validated)
            ? Carbon::parse((string) $validated['starts_at'])
            : $dubbingTest->starts_at;
        $endsAt = array_key_exists('ends_at', $validated)
            ? Carbon::parse((string) $validated['ends_at'])
            : $dubbingTest->ends_at;
        $resultsReleaseAt = array_key_exists('results_release_at', $validated)
            ? Carbon::parse((string) $validated['results_release_at'])
            : $dubbingTest->results_release_at;

        if ($endsAt->lessThanOrEqualTo($startsAt)) {
            abort(422, 'A data final deve ser maior que a data inicial.');
        }

        if ($resultsReleaseAt->lessThan($endsAt)) {
            abort(422, 'A data de resultado deve ser igual ou posterior ao encerramento.');
        }

        if (array_key_exists('characters', $validated) && $dubbingTest->submissions()->exists()) {
            abort(422, 'Não é possível alterar personagens após receber inscrições.');
        }

        $before = $dubbingTest->toArray();

        DB::transaction(function () use ($validated, $request, $dubbingTest, $user, $organization, $before): void {
            $dubbingTest->fill($validated);
            $dubbingTest->save();

            if (array_key_exists('characters', $validated)) {
                $dubbingTest->characters()->delete();

                foreach ($validated['characters'] as $index => $characterInput) {
                    DubbingTestCharacter::create([
                        'dubbing_test_id' => $dubbingTest->id,
                        'name' => $characterInput['name'],
                        'description' => $characterInput['description'] ?? null,
                        'expectations' => $characterInput['expectations'] ?? null,
                        'appearance_estimate' => $characterInput['appearance_estimate'],
                        'position' => $index,
                    ]);
                }
            }

            foreach ($request->file('media', []) as $index => $mediaFile) {
                $path = $mediaFile->store('dubbing-tests/'.$dubbingTest->id.'/brief', 'local');

                DubbingTestMedia::create([
                    'dubbing_test_id' => $dubbingTest->id,
                    'media_path' => $path,
                    'media_type' => $this->resolveMediaType($mediaFile->getMimeType()),
                    'disk' => 'local',
                    'size_bytes' => (int) $mediaFile->getSize(),
                    'sort_order' => $dubbingTest->media()->count() + $index,
                ]);
            }

            if (! empty($validated['remove_media_ids'])) {
                $mediaToRemove = $dubbingTest->media()
                    ->whereIn('id', $validated['remove_media_ids'])
                    ->get();

                foreach ($mediaToRemove as $media) {
                    if ($media->media_path !== '') {
                        Storage::disk($media->disk ?: 'local')->delete($media->media_path);
                    }
                }

                $dubbingTest->media()
                    ->whereIn('id', $mediaToRemove->pluck('id')->all())
                    ->delete();
            }

            AuditTrail::record(
                'dubbing_test_updated',
                $dubbingTest,
                $user->id,
                $organization->id,
                $before,
                $dubbingTest->fresh()->toArray(),
                null,
                $request,
            );
        });

        $dubbingTest->load(['organization:id,name,slug', 'characters', 'media']);
        $dubbingTest->media->each(fn (DubbingTestMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));

        return response()->json([
            'message' => 'Teste de dublagem atualizado com sucesso.',
            'dubbing_test' => $dubbingTest,
        ]);
    }

    public function destroy(Request $request, Organization $organization, DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para remover teste de dublagem.');
        }

        $before = $dubbingTest->toArray();

        DB::transaction(function () use ($dubbingTest, $organization, $user, $before, $request): void {
            $dubbingTest->load([
                'media:id,dubbing_test_id,media_path,disk',
                'submissions.media:id,submission_id,media_path,disk',
            ]);

            foreach ($dubbingTest->media as $media) {
                if ($media->media_path !== '') {
                    Storage::disk($media->disk ?: 'local')->delete($media->media_path);
                }
            }

            foreach ($dubbingTest->submissions as $submission) {
                foreach ($submission->media as $media) {
                    if ($media->media_path !== '') {
                        Storage::disk($media->disk ?: 'local')->delete($media->media_path);
                    }
                }
            }

            $dubbingTest->delete();

            AuditTrail::record(
                'dubbing_test_deleted',
                $dubbingTest,
                $user->id,
                $organization->id,
                $before,
                null,
                null,
                $request,
            );
        });

        return response()->json([
            'message' => 'Teste de dublagem removido com sucesso.',
        ]);
    }

    public function show(DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if (! $this->canViewTest($user, $dubbingTest)) {
            abort(403, 'Sem permissao para visualizar este teste.');
        }

        $canManage = $user instanceof User
            && $dubbingTest->organization instanceof Organization
            && OrganizationAccess::canManageOrganization($user, $dubbingTest->organization);

        if ($dubbingTest->status !== 'published' && ! $canManage) {
            abort(403, 'Teste indisponivel no momento.');
        }

        $dubbingTest->load([
            'organization:id,name,slug,avatar_path',
            'characters',
            'media',
        ])->loadCount(['characters', 'submissions']);

        $dubbingTest->media->each(fn (DubbingTestMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));

        return response()->json([
            'dubbing_test' => $dubbingTest,
        ]);
    }

    public function submit(Request $request, DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if (! $this->canViewTest($user, $dubbingTest)) {
            abort(403, 'Sem permissao para se inscrever neste teste.');
        }

        if ($dubbingTest->status !== 'published') {
            abort(422, 'Teste ainda nao publicado.');
        }

        if (now()->lt($dubbingTest->starts_at) || now()->gt($dubbingTest->ends_at)) {
            abort(422, 'Periodo de inscricoes encerrado ou ainda nao iniciado.');
        }

        $validated = $request->validate([
            'character_id' => ['required', 'integer'],
            'cover_letter' => ['required', 'string', 'max:5000'],
            'media' => ['required', 'array', 'min:1'],
            'media.*' => $this->mediaFileRules(),
        ]);

        $character = DubbingTestCharacter::query()
            ->where('id', $validated['character_id'])
            ->where('dubbing_test_id', $dubbingTest->id)
            ->first();

        if (! $character) {
            abort(422, 'Personagem invalido para este teste.');
        }

        if (DubbingTestSubmission::query()
            ->where('character_id', $character->id)
            ->where('user_id', $user->id)
            ->exists()) {
            abort(422, 'Voce ja enviou inscricao para esse personagem.');
        }

        $submission = DB::transaction(function () use ($validated, $dubbingTest, $character, $user, $request): DubbingTestSubmission {
            $submission = DubbingTestSubmission::create([
                'dubbing_test_id' => $dubbingTest->id,
                'character_id' => $character->id,
                'user_id' => $user->id,
                'cover_letter' => $validated['cover_letter'],
                'status' => 'submitted',
                'visible_to_candidate_at' => null,
            ]);

            foreach ($request->file('media', []) as $mediaFile) {
                $path = $mediaFile->store('dubbing-tests/'.$dubbingTest->id.'/submissions/'.$submission->id, 'local');

                DubbingTestSubmissionMedia::create([
                    'submission_id' => $submission->id,
                    'media_path' => $path,
                    'media_type' => $this->resolveMediaType($mediaFile->getMimeType()),
                    'disk' => 'local',
                    'size_bytes' => (int) $mediaFile->getSize(),
                ]);
            }

            AuditTrail::record(
                'dubbing_test_submission_created',
                $submission,
                $user->id,
                $dubbingTest->organization_id,
                null,
                $submission->toArray(),
                ['character_id' => $character->id],
                $request,
            );

            return $submission;
        });

        $submission->load([
            'character:id,name,appearance_estimate',
            'media',
        ]);

        $submission->media->each(fn (DubbingTestSubmissionMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));
        app(AchievementEngine::class)->onDubbingTestSubmitted($submission);

        return response()->json([
            'message' => 'Inscricao enviada com sucesso. O envio nao pode ser editado.',
            'submission' => $submission,
        ], 201);
    }

    public function mySubmissions(DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if (! $this->canViewTest($user, $dubbingTest)) {
            abort(403, 'Sem permissao para visualizar inscricoes deste teste.');
        }

        $submissions = DubbingTestSubmission::query()
            ->where('dubbing_test_id', $dubbingTest->id)
            ->where('user_id', $user->id)
            ->with([
                'character:id,name,appearance_estimate',
                'media',
                'dubbingTest:id,status',
            ])
            ->latest('created_at')
            ->get();

        $submissions->each(function (DubbingTestSubmission $submission): void {
            $isVisible = $submission->dubbingTest?->status === 'results_released';
            $submission->setAttribute('effective_status', $isVisible ? $submission->status : 'submitted');

            $submission->media->each(fn (DubbingTestSubmissionMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));
        });

        return response()->json([
            'submissions' => $submissions,
        ]);
    }

    public function listSubmissions(Organization $organization, DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para gerenciar inscricoes.');
        }

        $submissions = DubbingTestSubmission::query()
            ->where('dubbing_test_id', $dubbingTest->id)
            ->with([
                'user:id,name,username,avatar_path',
                'character:id,name,appearance_estimate',
                'reviewer:id,name,username,avatar_path',
                'media',
            ])
            ->latest('created_at')
            ->paginate(30);

        $submissions->getCollection()->each(function (DubbingTestSubmission $submission): void {
            $submission->media->each(fn (DubbingTestSubmissionMedia $media) => $media->media_path = MediaAccess::signPath($media->media_path));
        });

        return response()->json($submissions);
    }

    public function reviewSubmission(Request $request, Organization $organization, DubbingTest $dubbingTest, DubbingTestSubmission $submission): JsonResponse
    {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id || $submission->dubbing_test_id !== $dubbingTest->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para revisar inscricoes.');
        }

        if ($dubbingTest->status === 'results_released') {
            abort(422, 'Seleção já concluída. Não é possível alterar inscrições.');
        }

        if (now()->greaterThan($dubbingTest->ends_at)) {
            abort(422, 'Prazo de revisão encerrado para este teste.');
        }

        $validated = $request->validate([
            'status' => ['required', 'in:approved,reserve,rejected'],
        ]);

        $reviewedSubmissionId = DB::transaction(function () use ($submission, $validated, $user, $dubbingTest, $organization, $request): int {
            $lockedSubmission = DubbingTestSubmission::query()
                ->where('id', $submission->id)
                ->lockForUpdate()
                ->firstOrFail();

            DubbingTestCharacter::query()
                ->where('id', $lockedSubmission->character_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($validated['status'] === 'approved') {
                $alreadyApproved = DubbingTestSubmission::query()
                    ->where('character_id', $lockedSubmission->character_id)
                    ->where('status', 'approved')
                    ->where('id', '!=', $lockedSubmission->id)
                    ->exists();

                if ($alreadyApproved) {
                    abort(422, 'Ja existe um aprovado para esse personagem.');
                }
            }

            $before = $lockedSubmission->toArray();

            $lockedSubmission->status = $validated['status'];
            $lockedSubmission->reviewed_by_user_id = $user->id;
            $lockedSubmission->reviewed_at = now();
            $lockedSubmission->visible_to_candidate_at = null;
            $lockedSubmission->save();

            AuditTrail::record(
                'dubbing_test_submission_reviewed',
                $lockedSubmission,
                $user->id,
                $organization->id,
                $before,
                $lockedSubmission->toArray(),
                null,
                $request,
            );

            return $lockedSubmission->id;
        });

        return response()->json([
            'message' => 'Inscricao revisada com sucesso.',
            'submission' => DubbingTestSubmission::query()->findOrFail($reviewedSubmissionId)->load([
                'user:id,name,username,avatar_path',
                'character:id,name,appearance_estimate',
                'reviewer:id,name,username,avatar_path',
            ]),
        ]);
    }

    public function saveRejectionFeedback(
        Request $request,
        Organization $organization,
        DubbingTest $dubbingTest,
        DubbingTestSubmission $submission
    ): JsonResponse {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id || $submission->dubbing_test_id !== $dubbingTest->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para atualizar feedback.');
        }

        if ($dubbingTest->status === 'results_released') {
            abort(422, 'Seleção já concluída. Não é possível alterar feedback.');
        }

        if (now()->greaterThan($dubbingTest->ends_at)) {
            abort(422, 'Prazo de revisão encerrado para este teste.');
        }

        if ($submission->status !== 'rejected') {
            abort(422, 'Feedback só pode ser salvo para inscrições reprovadas.');
        }

        $validated = $request->validate([
            'rejection_feedback' => ['required', 'string', 'max:5000'],
        ]);

        $before = $submission->toArray();

        $submission->rejection_feedback = trim((string) $validated['rejection_feedback']);
        $submission->reviewed_by_user_id = $user->id;
        $submission->reviewed_at = now();
        $submission->save();

        AuditTrail::record(
            'dubbing_test_submission_feedback_updated',
            $submission,
            $user->id,
            $organization->id,
            $before,
            $submission->toArray(),
            null,
            $request,
        );

        return response()->json([
            'message' => 'Feedback salvo com sucesso.',
            'submission' => $submission->load([
                'user:id,name,username,avatar_path',
                'character:id,name,appearance_estimate',
                'reviewer:id,name,username,avatar_path',
            ]),
        ]);
    }

    public function concludeSelection(Request $request, Organization $organization, DubbingTest $dubbingTest): JsonResponse
    {
        $user = auth('api')->user();

        if ($dubbingTest->organization_id !== $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para concluir seleção.');
        }

        if ($dubbingTest->status === 'results_released') {
            abort(422, 'A seleção deste teste já foi concluída.');
        }

        DB::transaction(function () use ($dubbingTest, $user, $organization, $request): void {
            DubbingTestSubmission::query()
                ->where('dubbing_test_id', $dubbingTest->id)
                ->where('status', 'submitted')
                ->update([
                    'status' => 'rejected',
                    'reviewed_by_user_id' => $user->id,
                    'reviewed_at' => now(),
                ]);

            $dubbingTest->status = 'results_released';
            $dubbingTest->save();

            $submissions = DubbingTestSubmission::query()
                ->where('dubbing_test_id', $dubbingTest->id)
                ->with([
                    'user:id,name,username,avatar_path,email',
                    'character:id,dubbing_test_id,name',
                    'dubbingTest:id,organization_id,title,status',
                    'dubbingTest.organization:id,slug,avatar_path',
                ])
                ->lockForUpdate()
                ->get();

            foreach ($submissions as $submission) {
                $submission->user?->notify(new DubbingTestResultReleased($submission));
                $submission->results_notified_at = now();
                $submission->visible_to_candidate_at = now();
                $submission->save();
            }

            AuditTrail::record(
                'dubbing_test_selection_concluded',
                $dubbingTest,
                $user->id,
                $organization->id,
                null,
                $dubbingTest->toArray(),
                [
                    'notified_submissions_count' => $submissions->count(),
                ],
                $request,
            );
        });

        return response()->json([
            'message' => 'Seleção concluída com sucesso. Resultados enviados para todos os participantes.',
        ]);
    }

    private function resolveMediaType(?string $mime): string
    {
        if (! is_string($mime)) {
            return 'file';
        }

        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }

        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }

        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }

        return 'file';
    }

    /**
     * @return array<int, string>
     */
    private function mediaFileRules(): array
    {
        return [
            'file',
            'max:'.self::MAX_MEDIA_FILE_SIZE_KB,
            'mimetypes:'.implode(',', self::ALLOWED_MEDIA_MIME_TYPES),
        ];
    }

    private function canViewTest(?User $user, DubbingTest $dubbingTest): bool
    {
        if ($dubbingTest->visibility === 'external') {
            return true;
        }

        $organization = $dubbingTest->organization;

        if (! $organization) {
            return false;
        }

        if (! ($user instanceof User)) {
            return false;
        }

        return OrganizationAccess::isActiveMember($user, $organization);
    }
}
