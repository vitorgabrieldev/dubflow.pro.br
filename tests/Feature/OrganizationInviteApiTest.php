<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrganizationInviteApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_list_and_revoke_invites(): void
    {
        $owner = User::factory()->create();
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Flow Org',
            'slug' => 'invite-flow-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $ownerToken = auth('api')->login($owner);

        $create = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/invites", [
            'role' => 'editor',
            'max_uses' => 2,
            'expires_in_hours' => 24,
        ]);

        $create->assertCreated()
            ->assertJsonPath('invite.role', 'editor')
            ->assertJsonPath('invite.max_uses', 2);

        $inviteId = (int) $create->json('invite.id');
        $inviteToken = (string) $create->json('invite.token');

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/organizations/{$organization->slug}/invites")
            ->assertOk()
            ->assertJsonFragment([
                'id' => $inviteId,
                'token' => $inviteToken,
            ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/invites/{$inviteId}")
            ->assertOk();

        $this->assertNotNull(OrganizationInvite::query()->findOrFail($inviteId)->revoked_at);
    }

    public function test_member_cannot_manage_invites(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Permission Org',
            'slug' => 'invite-permission-org',
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
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $invite = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'member',
            'max_uses' => 1,
            'expires_at' => now()->addDay(),
        ]);

        $memberToken = auth('api')->login($member);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/invites", [
            'role' => 'editor',
        ])->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/organizations/{$organization->slug}/invites")
            ->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/invites/{$invite->id}")
            ->assertStatus(403);
    }

    public function test_user_can_accept_active_invite_and_role_is_applied(): void
    {
        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Accept Invite Org',
            'slug' => 'accept-invite-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $invite = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'editor',
            'max_uses' => 1,
            'uses_count' => 0,
            'expires_at' => now()->addDay(),
        ]);

        $candidateToken = auth('api')->login($candidate);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$candidateToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/invites/{$invite->token}/accept")
            ->assertOk()
            ->assertJsonPath('membership.role', 'editor')
            ->assertJsonPath('membership.status', 'active');

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $candidate->id,
            'role' => 'editor',
            'status' => 'active',
        ]);

        $invite->refresh();
        $this->assertSame(1, $invite->uses_count);
        $this->assertNotNull($invite->revoked_at);
    }

    public function test_invite_with_single_use_cannot_be_accepted_by_second_user(): void
    {
        $owner = User::factory()->create();
        $firstCandidate = User::factory()->create();
        $secondCandidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Single Use Invite Org',
            'slug' => 'single-use-invite-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $invite = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'member',
            'max_uses' => 1,
            'uses_count' => 0,
            'expires_at' => now()->addDay(),
        ]);

        $firstToken = auth('api')->login($firstCandidate);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$firstToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/invites/{$invite->token}/accept")
            ->assertOk();

        $secondToken = auth('api')->login($secondCandidate);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$secondToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/invites/{$invite->token}/accept")
            ->assertStatus(422);

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $firstCandidate->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $secondCandidate->id,
        ]);
    }

    public function test_user_cannot_accept_expired_or_revoked_or_exhausted_invite(): void
    {
        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invalid Invite Org',
            'slug' => 'invalid-invite-org',
            'is_public' => true,
        ]);

        $expired = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'member',
            'max_uses' => 1,
            'uses_count' => 0,
            'expires_at' => now()->subHour(),
        ]);

        $revoked = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'member',
            'max_uses' => 3,
            'uses_count' => 0,
            'expires_at' => now()->addDay(),
            'revoked_at' => now(),
        ]);

        $exhausted = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'token' => Str::random(64),
            'role' => 'member',
            'max_uses' => 1,
            'uses_count' => 1,
            'expires_at' => now()->addDay(),
        ]);

        $candidateToken = auth('api')->login($candidate);

        foreach ([$expired->token, $revoked->token, $exhausted->token] as $token) {
            $this->withHeaders([
                'Authorization' => 'Bearer '.$candidateToken,
                'Accept' => 'application/json',
            ])->postJson("/api/v1/organizations/invites/{$token}/accept")
                ->assertStatus(422);
        }
    }
}
