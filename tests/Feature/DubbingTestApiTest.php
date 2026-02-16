<?php

namespace Tests\Feature;

use App\Models\DubbingTest;
use App\Models\DubbingTestCharacter;
use App\Models\DubbingTestMedia;
use App\Models\DubbingTestSubmission;
use App\Models\DubbingTestSubmissionMedia;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Notifications\DubbingTestResultReleased;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DubbingTestApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_tests_lists_all_for_manager_and_filters_for_non_manager(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-tests-list', 'Org Tests List');
        $this->addActiveMember($organization, $member, 'member');

        $draftInternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Draft interno',
            'visibility' => 'internal',
            'status' => 'draft',
        ]);
        $publishedExternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Published externo',
            'visibility' => 'external',
            'status' => 'published',
        ]);
        $publishedInternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Published interno',
            'visibility' => 'internal',
            'status' => 'published',
        ]);
        $closedExternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Closed externo',
            'visibility' => 'external',
            'status' => 'closed',
        ]);
        $resultsExternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Results externo',
            'visibility' => 'external',
            'status' => 'results_released',
        ]);
        $archivedExternal = $this->createDubbingTest($organization, $owner, [
            'title' => 'Archived externo',
            'visibility' => 'external',
            'status' => 'archived',
        ]);

        $ownerResponse = $this->withHeaders($this->authHeaders($owner))
            ->getJson("/api/v1/organizations/{$organization->slug}/dubbing-tests?per_page=50")
            ->assertOk();

        $ownerIds = collect($ownerResponse->json('data'))->pluck('id')->all();
        $this->assertContains($draftInternal->id, $ownerIds);
        $this->assertContains($publishedExternal->id, $ownerIds);
        $this->assertContains($publishedInternal->id, $ownerIds);
        $this->assertContains($closedExternal->id, $ownerIds);
        $this->assertContains($resultsExternal->id, $ownerIds);
        $this->assertContains($archivedExternal->id, $ownerIds);

        $outsiderResponse = $this->withHeaders($this->authHeaders($outsider))
            ->getJson("/api/v1/organizations/{$organization->slug}/dubbing-tests?per_page=50")
            ->assertOk();

        $outsiderIds = collect($outsiderResponse->json('data'))->pluck('id')->all();
        $this->assertContains($publishedExternal->id, $outsiderIds);
        $this->assertContains($closedExternal->id, $outsiderIds);
        $this->assertContains($resultsExternal->id, $outsiderIds);
        $this->assertNotContains($draftInternal->id, $outsiderIds);
        $this->assertNotContains($publishedInternal->id, $outsiderIds);
        $this->assertNotContains($archivedExternal->id, $outsiderIds);
    }

    public function test_show_endpoint_respects_visibility_and_status_rules(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-show-rules', 'Org Show Rules', false);
        $this->addActiveMember($organization, $member, 'member');

        $internalPublished = $this->createDubbingTest($organization, $owner, [
            'title' => 'Interno publicado',
            'visibility' => 'internal',
            'status' => 'published',
        ]);
        $internalDraft = $this->createDubbingTest($organization, $owner, [
            'title' => 'Interno draft',
            'visibility' => 'internal',
            'status' => 'draft',
        ]);
        $externalPublished = $this->createDubbingTest($organization, $owner, [
            'title' => 'Externo publicado',
            'visibility' => 'external',
            'status' => 'published',
        ]);
        $externalDraft = $this->createDubbingTest($organization, $owner, [
            'title' => 'Externo draft',
            'visibility' => 'external',
            'status' => 'draft',
        ]);

        $this->withHeaders($this->authHeaders($outsider))
            ->getJson("/api/v1/dubbing-tests/{$internalPublished->id}")
            ->assertStatus(403);

        $this->withHeaders($this->authHeaders($member))
            ->getJson("/api/v1/dubbing-tests/{$internalPublished->id}")
            ->assertOk()
            ->assertJsonPath('dubbing_test.id', $internalPublished->id);

        $this->withHeaders($this->authHeaders($member))
            ->getJson("/api/v1/dubbing-tests/{$internalDraft->id}")
            ->assertStatus(403);

        $this->withHeaders($this->authHeaders($owner))
            ->getJson("/api/v1/dubbing-tests/{$internalDraft->id}")
            ->assertOk()
            ->assertJsonPath('dubbing_test.id', $internalDraft->id);

        $this->withHeaders($this->authHeaders($outsider))
            ->getJson("/api/v1/dubbing-tests/{$externalPublished->id}")
            ->assertOk()
            ->assertJsonPath('dubbing_test.id', $externalPublished->id);

        $this->withHeaders($this->authHeaders($outsider))
            ->getJson("/api/v1/dubbing-tests/{$externalDraft->id}")
            ->assertStatus(403);
    }

    public function test_opportunities_endpoint_applies_query_and_appearance_filters(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-opportunity-filters', 'Org Opportunity Filters');

        $matching = $this->createDubbingTest($organization, $owner, [
            'title' => 'Naruto casting aberto',
            'visibility' => 'external',
            'status' => 'published',
        ]);
        DubbingTestCharacter::create([
            'dubbing_test_id' => $matching->id,
            'name' => 'Naruto',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $wrongAppearance = $this->createDubbingTest($organization, $owner, [
            'title' => 'Naruto coadjuvante',
            'visibility' => 'external',
            'status' => 'published',
        ]);
        DubbingTestCharacter::create([
            'dubbing_test_id' => $wrongAppearance->id,
            'name' => 'Shikamaru',
            'appearance_estimate' => 'coadjuvante',
            'position' => 0,
        ]);

        $expired = $this->createDubbingTest($organization, $owner, [
            'title' => 'Naruto expirado',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDays(5),
            'ends_at' => now()->subDay(),
            'results_release_at' => now()->addDay(),
        ]);
        DubbingTestCharacter::create([
            'dubbing_test_id' => $expired->id,
            'name' => 'Kakashi',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $response = $this->withHeaders($this->authHeaders($viewer))
            ->getJson('/api/v1/dubbing-tests/opportunities?q=Naruto&appearance=protagonista&visibility=external')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($matching->id, $ids);
        $this->assertNotContains($wrongAppearance->id, $ids);
        $this->assertNotContains($expired->id, $ids);
    }

    public function test_opportunities_internal_visibility_is_limited_to_active_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-opportunity-internal', 'Org Opportunity Internal');
        $this->addActiveMember($organization, $member, 'member');

        $internalTest = $this->createDubbingTest($organization, $owner, [
            'title' => 'Teste Interno',
            'visibility' => 'internal',
            'status' => 'published',
        ]);
        DubbingTestCharacter::create([
            'dubbing_test_id' => $internalTest->id,
            'name' => 'Personagem Interno',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $externalTest = $this->createDubbingTest($organization, $owner, [
            'title' => 'Teste Externo',
            'visibility' => 'external',
            'status' => 'published',
        ]);
        DubbingTestCharacter::create([
            'dubbing_test_id' => $externalTest->id,
            'name' => 'Personagem Externo',
            'appearance_estimate' => 'coadjuvante',
            'position' => 0,
        ]);

        $memberResponse = $this->withHeaders($this->authHeaders($member))
            ->getJson('/api/v1/dubbing-tests/opportunities?visibility=internal')
            ->assertOk();

        $memberIds = collect($memberResponse->json('data'))->pluck('id')->all();
        $this->assertContains($internalTest->id, $memberIds);

        $outsiderInternalResponse = $this->withHeaders($this->authHeaders($outsider))
            ->getJson('/api/v1/dubbing-tests/opportunities?visibility=internal')
            ->assertOk();

        $outsiderInternalIds = collect($outsiderInternalResponse->json('data'))->pluck('id')->all();
        $this->assertNotContains($internalTest->id, $outsiderInternalIds);

        $outsiderDefaultResponse = $this->withHeaders($this->authHeaders($outsider))
            ->getJson('/api/v1/dubbing-tests/opportunities')
            ->assertOk();

        $outsiderDefaultIds = collect($outsiderDefaultResponse->json('data'))->pluck('id')->all();
        $this->assertContains($externalTest->id, $outsiderDefaultIds);
        $this->assertNotContains($internalTest->id, $outsiderDefaultIds);
    }

    public function test_list_submissions_requires_manager_role_and_returns_submission_payload(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $candidate = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-list-submissions', 'Org List Submissions');

        $test = $this->createDubbingTest($organization, $owner, [
            'title' => 'Teste lista inscrições',
            'visibility' => 'external',
            'status' => 'published',
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Personagem 1',
            'appearance_estimate' => 'coadjuvante',
            'position' => 0,
        ]);

        $submission = DubbingTestSubmission::create([
            'dubbing_test_id' => $test->id,
            'character_id' => $character->id,
            'user_id' => $candidate->id,
            'cover_letter' => 'Minha demo',
            'status' => 'submitted',
            'visible_to_candidate_at' => null,
        ]);

        $mediaPath = "dubbing-tests/{$test->id}/submissions/{$submission->id}/voice.mp3";
        Storage::disk('local')->put($mediaPath, 'voice');

        DubbingTestSubmissionMedia::create([
            'submission_id' => $submission->id,
            'media_path' => $mediaPath,
            'media_type' => 'audio',
            'disk' => 'local',
            'size_bytes' => 5,
        ]);

        $this->withHeaders($this->authHeaders($owner))
            ->getJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions")
            ->assertOk()
            ->assertJsonPath('data.0.id', $submission->id)
            ->assertJsonPath('data.0.user.id', $candidate->id)
            ->assertJsonPath('data.0.character.id', $character->id);

        $this->withHeaders($this->authHeaders($outsider))
            ->getJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions")
            ->assertStatus(403);
    }

    public function test_destroy_requires_manager_and_removes_all_related_files_and_records_audit(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $member = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'org-destroy-test', 'Org Destroy Test');
        $this->addActiveMember($organization, $member, 'member');

        $test = $this->createDubbingTest($organization, $owner, [
            'title' => 'Teste para remover',
            'visibility' => 'external',
            'status' => 'results_released',
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Ken',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $briefPath = "dubbing-tests/{$test->id}/brief/brief.mp3";
        Storage::disk('local')->put($briefPath, 'brief');

        DubbingTestMedia::create([
            'dubbing_test_id' => $test->id,
            'media_path' => $briefPath,
            'media_type' => 'audio',
            'disk' => 'local',
            'size_bytes' => 5,
            'sort_order' => 0,
        ]);

        $submission = DubbingTestSubmission::create([
            'dubbing_test_id' => $test->id,
            'character_id' => $character->id,
            'user_id' => $candidate->id,
            'cover_letter' => 'Envio',
            'status' => 'submitted',
            'visible_to_candidate_at' => null,
        ]);

        $submissionPath = "dubbing-tests/{$test->id}/submissions/{$submission->id}/candidate.mp3";
        Storage::disk('local')->put($submissionPath, 'candidate');

        DubbingTestSubmissionMedia::create([
            'submission_id' => $submission->id,
            'media_path' => $submissionPath,
            'media_type' => 'audio',
            'disk' => 'local',
            'size_bytes' => 9,
        ]);

        $this->withHeaders($this->authHeaders($member))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}")
            ->assertStatus(403);

        Storage::disk('local')->assertExists($briefPath);
        Storage::disk('local')->assertExists($submissionPath);

        $this->withHeaders($this->authHeaders($owner))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Teste de dublagem removido com sucesso.');

        $this->assertSoftDeleted('dubbing_tests', ['id' => $test->id]);

        Storage::disk('local')->assertMissing($briefPath);
        Storage::disk('local')->assertMissing($submissionPath);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'dubbing_test_deleted',
            'organization_id' => $organization->id,
            'actor_user_id' => $owner->id,
        ]);
    }

    public function test_creation_rejects_unsupported_media_type(): void
    {
        $owner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Mime Org',
            'slug' => 'mime-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $token = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/dubbing-tests", [
            'title' => 'Teste MIME',
            'description' => 'Teste',
            'visibility' => 'external',
            'starts_at' => now()->subDay()->toIso8601String(),
            'ends_at' => now()->addDay()->toIso8601String(),
            'results_release_at' => now()->addDays(2)->toIso8601String(),
            'characters' => [
                [
                    'name' => 'Naruto',
                    'appearance_estimate' => 'protagonista',
                ],
            ],
            'media' => [
                UploadedFile::fake()->create('evil.html', 8, 'text/html'),
            ],
        ])->assertStatus(422);
    }

    public function test_owner_or_admin_can_create_dubbing_test_while_member_cannot(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Casting Org',
            'slug' => 'casting-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $payload = [
            'title' => 'Teste One Piece',
            'description' => 'Buscando voz para arco novo.',
            'visibility' => 'internal',
            'starts_at' => now()->subHour()->toIso8601String(),
            'ends_at' => now()->addDays(3)->toIso8601String(),
            'results_release_at' => now()->addDays(4)->toIso8601String(),
            'characters' => [
                [
                    'name' => 'Luffy',
                    'description' => 'Protagonista.',
                    'expectations' => 'Voz energética.',
                    'appearance_estimate' => 'protagonista',
                ],
            ],
            'media' => [
                UploadedFile::fake()->create('brief.mp3', 300, 'audio/mpeg'),
            ],
        ];

        $memberToken = auth('api')->login($member);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/dubbing-tests", $payload)
            ->assertStatus(403);

        $adminToken = auth('api')->login($admin);
        $create = $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/dubbing-tests", $payload);

        $create->assertCreated()->assertJsonPath('dubbing_test.visibility', 'internal');

        $this->assertDatabaseHas('dubbing_tests', [
            'organization_id' => $organization->id,
            'title' => 'Teste One Piece',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'dubbing_test_created',
            'organization_id' => $organization->id,
            'actor_user_id' => $admin->id,
        ]);
    }

    public function test_internal_opportunity_only_appears_for_active_members_even_with_internal_filter(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Internal Org',
            'slug' => 'internal-org',
            'is_public' => false,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Interno Naruto',
            'description' => 'Somente membros',
            'visibility' => 'internal',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Sasuke',
            'appearance_estimate' => 'coadjuvante',
            'position' => 0,
        ]);

        $memberToken = auth('api')->login($member);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/dubbing-tests/opportunities?visibility=internal')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $test->id,
                'title' => 'Teste Interno Naruto',
            ]);

        $outsiderToken = auth('api')->login($outsider);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$outsiderToken,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/dubbing-tests/opportunities?visibility=internal')
            ->assertOk()
            ->assertJsonMissing([
                'id' => $test->id,
                'title' => 'Teste Interno Naruto',
            ]);
    }

    public function test_user_can_submit_only_once_per_character(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Submission Org',
            'slug' => 'submission-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Externo Bleach',
            'description' => 'Aberto',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Ichigo',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $token = auth('api')->login($candidate);

        $payload = [
            'character_id' => $character->id,
            'cover_letter' => 'Tenho experiência em shounen.',
            'media' => [
                UploadedFile::fake()->create('take1.mp3', 300, 'audio/mpeg'),
            ],
        ];

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/dubbing-tests/{$test->id}/submissions", $payload)
            ->assertCreated();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/dubbing-tests/{$test->id}/submissions", $payload)
            ->assertStatus(422);

        $this->assertDatabaseCount('dubbing_test_submissions', 1);
    }

    public function test_only_one_submission_can_be_approved_per_character(): void
    {
        $owner = User::factory()->create();
        $candidateA = User::factory()->create();
        $candidateB = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Approval Lock Org',
            'slug' => 'approval-lock-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Aprovacao Unica',
            'description' => 'Apenas um aprovado por personagem',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Goku',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $submissionA = DubbingTestSubmission::create([
            'dubbing_test_id' => $test->id,
            'character_id' => $character->id,
            'user_id' => $candidateA->id,
            'cover_letter' => 'Envio A',
            'status' => 'submitted',
            'visible_to_candidate_at' => $test->results_release_at,
        ]);

        $submissionB = DubbingTestSubmission::create([
            'dubbing_test_id' => $test->id,
            'character_id' => $character->id,
            'user_id' => $candidateB->id,
            'cover_letter' => 'Envio B',
            'status' => 'submitted',
            'visible_to_candidate_at' => $test->results_release_at,
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$submissionA->id}/review", [
            'status' => 'approved',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$submissionB->id}/review", [
            'status' => 'approved',
        ])->assertStatus(422);
    }

    public function test_update_validates_dates_against_existing_values(): void
    {
        $owner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Date Rules Org',
            'slug' => 'date-rules-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Datas',
            'description' => 'Regras',
            'visibility' => 'external',
            'status' => 'draft',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}", [
            'results_release_at' => now()->subDays(2)->toIso8601String(),
        ])->assertStatus(422);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}", [
            'ends_at' => now()->subDays(3)->toIso8601String(),
        ])->assertStatus(422);
    }

    public function test_updating_results_release_date_does_not_force_submission_visibility(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Visibility Sync Org',
            'slug' => 'visibility-sync-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Sync',
            'description' => 'Sync de data',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Mikasa',
            'appearance_estimate' => 'coadjuvante',
            'position' => 0,
        ]);

        $candidateToken = auth('api')->login($candidate);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$candidateToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/dubbing-tests/{$test->id}/submissions", [
            'character_id' => $character->id,
            'cover_letter' => 'Envio de teste',
            'media' => [UploadedFile::fake()->create('take.mp3', 200, 'audio/mpeg')],
        ])->assertCreated();

        $submission = DubbingTestSubmission::query()
            ->where('dubbing_test_id', $test->id)
            ->where('user_id', $candidate->id)
            ->firstOrFail();

        $newReleaseAt = now()->addDays(5)->setSecond(0);
        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}", [
            'results_release_at' => $newReleaseAt->toIso8601String(),
        ])->assertOk();

        $submission->refresh();
        $this->assertNull($submission->visible_to_candidate_at);
    }

    public function test_update_can_remove_existing_briefing_media(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Media Edit Org',
            'slug' => 'media-edit-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Midia Edit',
            'description' => 'Editar midia',
            'visibility' => 'external',
            'status' => 'draft',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ]);

        Storage::disk('local')->put("dubbing-tests/{$test->id}/brief/keep.mp3", 'keep');
        Storage::disk('local')->put("dubbing-tests/{$test->id}/brief/remove.mp3", 'remove');

        $keepMedia = DubbingTestMedia::create([
            'dubbing_test_id' => $test->id,
            'media_path' => "dubbing-tests/{$test->id}/brief/keep.mp3",
            'media_type' => 'audio',
            'disk' => 'local',
            'size_bytes' => 4,
            'sort_order' => 0,
        ]);

        $removeMedia = DubbingTestMedia::create([
            'dubbing_test_id' => $test->id,
            'media_path' => "dubbing-tests/{$test->id}/brief/remove.mp3",
            'media_type' => 'audio',
            'disk' => 'local',
            'size_bytes' => 6,
            'sort_order' => 1,
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}", [
            'remove_media_ids' => [$removeMedia->id],
        ])->assertOk();

        $this->assertDatabaseHas('dubbing_test_media', [
            'id' => $keepMedia->id,
        ]);
        $this->assertDatabaseMissing('dubbing_test_media', [
            'id' => $removeMedia->id,
        ]);

        Storage::disk('local')->assertExists("dubbing-tests/{$test->id}/brief/keep.mp3");
        Storage::disk('local')->assertMissing("dubbing-tests/{$test->id}/brief/remove.mp3");
    }

    public function test_selection_is_released_only_when_concluded_and_notifies_all_statuses_with_feedback(): void
    {
        Storage::fake('local');
        Notification::fake();

        $owner = User::factory()->create();
        $approvedUser = User::factory()->create();
        $reserveUser = User::factory()->create();
        $rejectedUser = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Release Org',
            'slug' => 'release-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $test = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'title' => 'Teste Resultado',
            'description' => 'Com liberação futura',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDay(),
        ]);

        $character = DubbingTestCharacter::create([
            'dubbing_test_id' => $test->id,
            'name' => 'Levi',
            'appearance_estimate' => 'protagonista',
            'position' => 0,
        ]);

        $submit = function (User $user) use ($test, $character): void {
            $token = auth('api')->login($user);

            $this->withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Accept' => 'application/json',
            ])->postJson("/api/v1/dubbing-tests/{$test->id}/submissions", [
                'character_id' => $character->id,
                'cover_letter' => 'Minha interpretação.',
                'media' => [UploadedFile::fake()->create('take.mp3', 200, 'audio/mpeg')],
            ])->assertCreated();
        };

        $submit($approvedUser);
        $submit($reserveUser);
        $submit($rejectedUser);

        $ownerToken = auth('api')->login($owner);

        $approvedSubmissionId = (int) $test->submissions()->where('user_id', $approvedUser->id)->value('id');
        $reserveSubmissionId = (int) $test->submissions()->where('user_id', $reserveUser->id)->value('id');
        $rejectedSubmissionId = (int) $test->submissions()->where('user_id', $rejectedUser->id)->value('id');

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$approvedSubmissionId}/review", [
            'status' => 'approved',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$reserveSubmissionId}/review", [
            'status' => 'reserve',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$rejectedSubmissionId}/review", [
            'status' => 'rejected',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/submissions/{$rejectedSubmissionId}/feedback", [
            'rejection_feedback' => 'Precisa melhorar dicção.',
        ])->assertOk();

        $approvedToken = auth('api')->login($approvedUser);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$approvedToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/dubbing-tests/{$test->id}/my-submissions")
            ->assertOk()
            ->assertJsonPath('submissions.0.effective_status', 'submitted');

        Artisan::call('dubbing-tests:release-results');
        Notification::assertNothingSent();

        $ownerToken = auth('api')->login($owner);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}/conclude-selection")
            ->assertOk();

        Notification::assertSentTo($approvedUser, DubbingTestResultReleased::class);
        Notification::assertSentTo($reserveUser, DubbingTestResultReleased::class);
        Notification::assertSentTo($rejectedUser, DubbingTestResultReleased::class);
        $this->assertCount(1, Notification::sent($approvedUser, DubbingTestResultReleased::class));
        $this->assertCount(1, Notification::sent($reserveUser, DubbingTestResultReleased::class));
        $this->assertCount(1, Notification::sent($rejectedUser, DubbingTestResultReleased::class));

        $rejectedNotificationPayload = Notification::sent($rejectedUser, DubbingTestResultReleased::class)
            ->first()
            ->toArray($rejectedUser);
        $this->assertSame('rejected', $rejectedNotificationPayload['meta']['status']);
        $this->assertSame('Precisa melhorar dicção.', $rejectedNotificationPayload['meta']['rejection_feedback']);

        $approvedToken = auth('api')->login($approvedUser);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$approvedToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/dubbing-tests/{$test->id}/my-submissions")
            ->assertOk()
            ->assertJsonPath('submissions.0.effective_status', 'approved');

        $this->assertDatabaseHas('dubbing_tests', [
            'id' => $test->id,
            'status' => 'results_released',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'dubbing_test_submission_reviewed',
            'organization_id' => $organization->id,
            'actor_user_id' => $owner->id,
        ]);
    }

    public function test_update_rejects_direct_transition_to_results_released_status(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationWithOwner($owner, 'org-update-results-block', 'Org Update Results Block');

        $test = $this->createDubbingTest($organization, $owner, [
            'title' => 'Teste sem concluir seleção',
            'visibility' => 'external',
            'status' => 'published',
        ]);

        $this->withHeaders($this->authHeaders($owner))
            ->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$test->id}", [
                'status' => 'results_released',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Use "Concluir seleção" para finalizar e liberar os resultados.');
    }

    private function createOrganizationWithOwner(User $owner, string $slug, string $name, bool $isPublic = true): Organization
    {
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => $name,
            'slug' => $slug,
            'is_public' => $isPublic,
        ]);

        $this->addActiveMember($organization, $owner, 'owner');

        return $organization;
    }

    private function addActiveMember(Organization $organization, User $user, string $role): void
    {
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function authHeaders(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.auth('api')->login($user),
            'Accept' => 'application/json',
        ];
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function createDubbingTest(Organization $organization, User $creator, array $overrides = []): DubbingTest
    {
        return DubbingTest::create(array_merge([
            'organization_id' => $organization->id,
            'created_by_user_id' => $creator->id,
            'title' => 'Teste '.uniqid(),
            'description' => 'Descrição',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_release_at' => now()->addDays(2),
        ], $overrides));
    }
}
