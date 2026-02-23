<?php

namespace Tests\Feature;

use App\Jobs\ProcessEditorAssetJob;
use App\Jobs\RenderEditorProjectJob;
use App\Models\EditorProject;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class EditorProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_member_can_create_editor_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-a');
        $this->attachMember($organization, $owner, 'owner');
        $this->attachMember($organization, $member, 'member');

        $response = $this->withHeaders($this->authHeaders($this->issueToken($member)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects", [
                'title' => 'Episódio 01 - Corte base',
                'description' => 'Primeiro corte para dublagem',
                'source_language' => 'ja',
                'target_language' => 'pt-BR',
            ])
            ->assertCreated()
            ->json();

        $projectId = (int) ($response['project']['id'] ?? 0);
        $this->assertGreaterThan(0, $projectId);

        $this->assertDatabaseHas('editor_projects', [
            'id' => $projectId,
            'organization_id' => $organization->id,
            'owner_user_id' => $member->id,
            'title' => 'Episódio 01 - Corte base',
        ]);
    }

    public function test_non_member_cannot_create_editor_project(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-b');
        $this->attachMember($organization, $owner, 'owner');

        $this->withHeaders($this->authHeaders($this->issueToken($outsider)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects", [
                'title' => 'Projeto bloqueado',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Sem permissão para usar o editor nesta comunidade.');
    }

    public function test_only_project_owner_can_open_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $otherMember = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-c');
        $this->attachMember($organization, $owner, 'owner');
        $this->attachMember($organization, $member, 'member');
        $this->attachMember($organization, $otherMember, 'editor');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $member->id,
            'title' => 'Projeto privado',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($otherMember)))
            ->getJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Somente o dono deste projeto pode acessá-lo.');
    }

    public function test_upload_asset_dispatches_processing_job(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-d');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto upload',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->post("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/assets", [
                'files' => [
                    UploadedFile::fake()->create('clip.mp4', 5120, 'video/mp4'),
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseCount('editor_project_assets', 1);
        Bus::assertDispatched(ProcessEditorAssetJob::class);
    }

    public function test_upload_assets_rejects_image_files(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-d-image-block');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto upload bloqueado imagem',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->post("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/assets", [
                'files' => [
                    UploadedFile::fake()->image('poster.png'),
                ],
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('editor_project_assets', 0);
        Bus::assertNotDispatched(ProcessEditorAssetJob::class);
    }

    public function test_autosave_updates_timeline_and_subtitles(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-e');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto autosave',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $asset = $project->assets()->create([
            'asset_type' => 'video',
            'label' => 'timeline.mp4',
            'path' => 'editor-projects/'.$project->id.'/assets/timeline.mp4',
            'disk' => 'local',
            'mime' => 'video/mp4',
            'size_bytes' => 1024,
            'duration_ms' => 30000,
            'sort_order' => 1,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/autosave", [
                'duration_ms' => 150000,
                'timeline_json' => [
                    'video_clips' => [
                        [
                            'asset_id' => $asset->id,
                            'source_in_ms' => 0,
                            'source_out_ms' => 10000,
                            'timeline_start_ms' => 0,
                        ],
                    ],
                    'audio_clips' => [],
                    'subtitle_clips' => [],
                ],
                'subtitles' => [
                    [
                        'language_code' => 'pt-BR',
                        'start_ms' => 1000,
                        'end_ms' => 3800,
                        'text' => 'Teste de legenda',
                        'style_json' => [
                            'font_family' => 'Arial',
                            'font_size' => 34,
                            'color' => '#ffffff',
                            'position' => 'bottom_center',
                        ],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('project.duration_ms', 150000)
            ->assertJsonCount(1, 'project.subtitles');

        $project->refresh();
        $this->assertSame(150000, (int) $project->duration_ms);
        $this->assertDatabaseCount('editor_project_subtitles', 1);
    }

    public function test_autosave_accepts_timeline_without_audio_clips_key(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-e-audio-optional');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto autosave sem audio_clips',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/autosave", [
                'duration_ms' => 9000,
                'timeline_json' => [
                    'video_clips' => [],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('project.timeline_json.audio_clips', []);

        $project->refresh();
        $this->assertSame([], $project->timeline_json['audio_clips'] ?? null);
    }

    public function test_autosave_is_blocked_for_finalized_project(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-e-finalized');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto finalizado',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'rendered',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
            'source_assets_purged_at' => now(),
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/autosave", [
                'duration_ms' => 5000,
                'timeline_json' => [
                    'video_clips' => [],
                    'audio_clips' => [],
                    'subtitle_clips' => [],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Este projeto já foi finalizado e os arquivos de origem foram removidos. Crie um novo projeto para continuar editando.'
            );
    }

    public function test_queue_render_dispatches_render_job(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-f');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto render',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 2048,
        ]);

        $project->assets()->create([
            'asset_type' => 'video',
            'label' => 'capitulo-1.mp4',
            'path' => 'editor-projects/'.$project->id.'/assets/capitulo-1.mp4',
            'disk' => 'local',
            'mime' => 'video/mp4',
            'size_bytes' => 2048,
            'duration_ms' => 60000,
            'sort_order' => 1,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/renders", [
                'preset' => 'full_hd_1080p',
                'output_mode' => 'video_with_soft_subtitles',
            ])
            ->assertStatus(202)
            ->assertJsonPath('render.status', 'queued');

        $this->assertDatabaseCount('editor_project_renders', 1);
        Bus::assertDispatched(RenderEditorProjectJob::class);
    }

    public function test_queue_render_accepts_image_assets_in_workspace(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-f-image');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto render com imagem',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 1024,
        ]);

        $project->assets()->create([
            'asset_type' => 'image',
            'label' => 'frame.png',
            'path' => 'editor-projects/'.$project->id.'/assets/frame.png',
            'disk' => 'local',
            'mime' => 'image/png',
            'size_bytes' => 1024,
            'duration_ms' => null,
            'sort_order' => 1,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/renders", [
                'preset' => 'preview_720p',
                'output_mode' => 'video_no_subtitles',
            ])
            ->assertStatus(202)
            ->assertJsonPath('render.status', 'queued');

        Bus::assertDispatched(RenderEditorProjectJob::class);
    }

    public function test_queue_render_blocks_duplicate_pending_render(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-f-dup-render');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto render pendente',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'rendering',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 1024,
        ]);

        $project->assets()->create([
            'asset_type' => 'video',
            'label' => 'take-01.mp4',
            'path' => 'editor-projects/'.$project->id.'/assets/take-01.mp4',
            'disk' => 'local',
            'mime' => 'video/mp4',
            'size_bytes' => 1024,
            'duration_ms' => 30000,
            'sort_order' => 1,
        ]);

        $project->renders()->create([
            'requested_by_user_id' => $owner->id,
            'status' => 'queued',
            'progress_percent' => 0,
            'preset' => 'full_hd_1080p',
            'output_mode' => 'video_with_soft_subtitles',
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/renders", [
                'preset' => 'full_hd_1080p',
                'output_mode' => 'video_with_soft_subtitles',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Já existe uma renderização em andamento para este projeto. Aguarde finalizar para iniciar outra.');

        Bus::assertNotDispatched(RenderEditorProjectJob::class);
    }

    public function test_queue_render_is_blocked_after_source_assets_are_purged(): void
    {
        Bus::fake();

        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-g');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto finalizado',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'rendered',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
            'source_assets_purged_at' => now(),
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/renders", [
                'preset' => 'full_hd_1080p',
                'output_mode' => 'video_with_soft_subtitles',
            ])
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Este projeto já foi finalizado e os arquivos de origem foram removidos. Crie um novo projeto para nova renderização.'
            );

        Bus::assertNotDispatched(RenderEditorProjectJob::class);
    }

    public function test_owner_can_rename_project_title(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganization($owner, 'studio-h');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto Nome Antigo',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->patchJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}", [
                'title' => 'Projeto Nome Novo',
            ])
            ->assertOk()
            ->assertJsonPath('project.title', 'Projeto Nome Novo');

        $this->assertDatabaseHas('editor_projects', [
            'id' => $project->id,
            'title' => 'Projeto Nome Novo',
        ]);
    }

    public function test_delete_project_requires_exact_confirmation_phrase(): void
    {
        $owner = User::factory()->create([
            'name' => 'Alice Dub',
            'stage_name' => 'Voz Alice',
        ]);
        $organization = $this->createOrganization($owner, 'studio-i');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto Segredo',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}", [
                'confirmation_phrase' => 'frase incorreta',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Frase de confirmação inválida. Copie exatamente a frase exigida.');

        $this->assertDatabaseHas('editor_projects', [
            'id' => $project->id,
            'deleted_at' => null,
        ]);
    }

    public function test_owner_can_delete_project_with_confirmation_phrase(): void
    {
        $owner = User::factory()->create([
            'name' => 'Bruno Costa',
            'stage_name' => null,
        ]);
        $organization = $this->createOrganization($owner, 'studio-j');
        $this->attachMember($organization, $owner, 'owner');

        $project = EditorProject::query()->create([
            'organization_id' => $organization->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto Final',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $expectedPhrase = 'Eu usuário Bruno Costa desejo deletar o projeto Projeto Final';

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}", [
                'confirmation_phrase' => $expectedPhrase,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Projeto removido com sucesso.');

        $this->assertSoftDeleted('editor_projects', [
            'id' => $project->id,
        ]);
    }

    public function test_authenticated_user_can_list_my_editor_projects_with_organization_data(): void
    {
        $owner = User::factory()->create([
            'name' => 'Carlos Nunes',
            'stage_name' => 'Cadu',
        ]);
        $otherUser = User::factory()->create();

        $organizationA = $this->createOrganization($owner, 'studio-k');
        $organizationB = $this->createOrganization($owner, 'studio-l');
        $this->attachMember($organizationA, $owner, 'owner');
        $this->attachMember($organizationB, $owner, 'owner');

        EditorProject::query()->create([
            'organization_id' => $organizationA->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto A',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);
        EditorProject::query()->create([
            'organization_id' => $organizationB->id,
            'owner_user_id' => $owner->id,
            'title' => 'Projeto B',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);
        EditorProject::query()->create([
            'organization_id' => $organizationA->id,
            'owner_user_id' => $otherUser->id,
            'title' => 'Projeto de Outro Usuário',
            'source_language' => 'ja',
            'target_language' => 'pt-BR',
            'status' => 'draft',
            'timeline_json' => ['video_clips' => [], 'audio_clips' => []],
            'storage_bytes' => 0,
        ]);

        $response = $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->getJson('/api/v1/editor-projects/mine?per_page=50')
            ->assertOk();

        $items = collect($response->json('data'));
        $titles = $items->pluck('title')->all();

        $this->assertContains('Projeto A', $titles);
        $this->assertContains('Projeto B', $titles);
        $this->assertNotContains('Projeto de Outro Usuário', $titles);

        $firstItem = $items->first();
        $this->assertIsArray($firstItem['organization'] ?? null);
        $this->assertArrayHasKey('slug', $firstItem['organization'] ?? []);
        $this->assertArrayHasKey('required_delete_phrase', $firstItem);
    }

    private function createOrganization(User $owner, string $slug): Organization
    {
        return Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Comunidade '.strtoupper($slug),
            'slug' => $slug,
            'description' => 'Teste de comunidade',
            'is_public' => true,
            'is_verified' => false,
            'settings' => ['languages' => ['pt-BR']],
        ]);
    }

    private function attachMember(Organization $organization, User $user, string $role): void
    {
        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => 'active',
            'source' => 'invite',
            'joined_at' => now(),
            'approved_at' => now(),
            'approved_by_user_id' => $organization->owner_user_id,
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function authHeaders(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];
    }

    private function issueToken(User $user): string
    {
        return auth('api')->login($user);
    }
}
