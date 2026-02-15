<?php

namespace Tests\Feature;

use App\Models\DubbingTest;
use App\Models\DubbingTestCharacter;
use App\Models\DubbingTestMedia;
use App\Models\DubbingTestSubmission;
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
}
