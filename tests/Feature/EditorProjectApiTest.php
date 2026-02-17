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

        $this->withHeaders($this->authHeaders($this->issueToken($owner)))
            ->postJson("/api/v1/organizations/{$organization->slug}/editor-projects/{$project->id}/autosave", [
                'duration_ms' => 150000,
                'timeline_json' => [
                    'video_clips' => [
                        [
                            'asset_id' => 10,
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
