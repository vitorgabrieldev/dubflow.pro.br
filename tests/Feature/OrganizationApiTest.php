<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Notifications\OrganizationMemberInvited;
use App\Notifications\OrganizationMemberInviteResponded;
use App\Notifications\OrganizationMemberJoined;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrganizationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_and_follow_organization(): void
    {
        $owner = User::factory()->create();
        $follower = User::factory()->create();

        $ownerToken = auth('api')->login($owner);
        $followerToken = auth('api')->login($follower);

        $create = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
        ])->postJson('/api/v1/organizations', [
            'name' => 'DubFlow Community',
            'description' => 'Comunidade de dublagem.',
            'is_public' => true,
        ]);

        $create->assertCreated();
        $slug = (string) $create->json('organization.slug');
        $this->assertNotEmpty($slug);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$followerToken,
        ])->postJson("/api/v1/organizations/{$slug}/follow")
            ->assertOk();

        $this->assertDatabaseHas('organization_follows', [
            'user_id' => $follower->id,
        ]);
    }

    public function test_owner_can_create_invite_and_member_can_accept(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Org',
            'slug' => 'invite-org',
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

        $inviteCreate = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
        ])->postJson("/api/v1/organizations/{$organization->slug}/invites", [
            'role' => 'editor',
            'max_uses' => 2,
            'expires_in_hours' => 24,
        ]);

        $inviteCreate->assertCreated()->assertJsonStructure([
            'invite' => ['id', 'token'],
        ]);

        $token = (string) $inviteCreate->json('invite.token');
        $this->assertNotEmpty($token);

        $memberToken = auth('api')->login($member);

        $accept = $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
        ])->postJson("/api/v1/organizations/invites/{$token}/accept");

        $accept->assertOk()->assertJsonPath('membership.role', 'editor');

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'status' => 'active',
            'role' => 'editor',
        ]);

        $invite = OrganizationInvite::query()->where('token', $token)->firstOrFail();
        $this->assertSame(1, $invite->uses_count);
    }

    public function test_owner_can_update_organization_with_images(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Original',
            'slug' => 'org-original',
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

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->post("/api/v1/organizations/{$organization->slug}", [
            '_method' => 'PATCH',
            'name' => 'Org Atualizada',
            'description' => 'Descrição atualizada.',
            'website_url' => 'https://dubflow.dev/org',
            'is_public' => '0',
            'avatar' => UploadedFile::fake()->image('avatar.png'),
            'cover' => UploadedFile::fake()->image('cover.jpg'),
        ]);

        $response->assertOk()->assertJsonPath('organization.name', 'Org Atualizada');

        $avatarPath = (string) $response->json('organization.avatar_path');
        $coverPath = (string) $response->json('organization.cover_path');

        Storage::disk('public')->assertExists($avatarPath);
        Storage::disk('public')->assertExists($coverPath);

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Org Atualizada',
            'is_public' => false,
        ]);
    }

    public function test_only_owner_can_change_member_roles(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Roles Org',
            'slug' => 'roles-org',
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

        $adminToken = auth('api')->login($admin);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/members/{$member->id}", [
            'role' => 'editor',
        ])->assertStatus(403);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$organization->slug}/members/{$member->id}", [
            'role' => 'editor',
        ])->assertOk();

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'editor',
        ]);
    }

    public function test_owner_can_search_member_candidates_by_email(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner-candidates@test.dev',
        ]);
        $existingMember = User::factory()->create([
            'email' => 'ja-membro@test.dev',
        ]);
        $candidate = User::factory()->create([
            'email' => 'convite-especial@test.dev',
            'name' => 'Pessoa Convite',
        ]);

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Candidates Org',
            'slug' => 'candidates-org',
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
            'user_id' => $existingMember->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $ownerToken = auth('api')->login($owner);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/organizations/{$organization->slug}/member-candidates?q=convite-especial");

        $response->assertOk()
            ->assertJsonPath('users.0.id', $candidate->id)
            ->assertJsonMissing([
                'id' => $existingMember->id,
            ]);
    }

    public function test_invited_user_receives_notification_when_member_invite_is_created(): void
    {
        Notification::fake();

        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Notify Org',
            'slug' => 'invite-notify-org',
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

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members", [
            'user_id' => $candidate->id,
            'role' => 'editor',
        ])->assertCreated();

        Notification::assertSentTo($candidate, OrganizationMemberInvited::class);
    }

    public function test_accepting_invite_notifies_inviter_and_active_members(): void
    {
        Notification::fake();

        $owner = User::factory()->create();
        $activeMember = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Member Joined Org',
            'slug' => 'member-joined-org',
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
            'user_id' => $activeMember->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $candidate->id,
            'role' => 'editor',
            'status' => 'pending',
            'invited_by_user_id' => $owner->id,
        ]);

        $candidateToken = auth('api')->login($candidate);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$candidateToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members/accept")
            ->assertOk()
            ->assertJsonPath('member.status', 'active')
            ->assertJsonPath('member.role', 'editor');

        Notification::assertSentTo($owner, OrganizationMemberInviteResponded::class, function ($notification) use ($owner) {
            return $notification->toArray($owner)['meta']['status'] === 'accepted';
        });
        Notification::assertSentTo($owner, OrganizationMemberJoined::class);
        Notification::assertSentTo($activeMember, OrganizationMemberJoined::class);
        Notification::assertNotSentTo($candidate, OrganizationMemberJoined::class);
    }

    public function test_rejecting_invite_notifies_only_inviter_about_rejection(): void
    {
        Notification::fake();

        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Reject Org',
            'slug' => 'invite-reject-org',
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
            'user_id' => $candidate->id,
            'role' => 'member',
            'status' => 'pending',
            'invited_by_user_id' => $owner->id,
        ]);

        $candidateToken = auth('api')->login($candidate);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$candidateToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members/reject")
            ->assertOk()
            ->assertJsonPath('member.status', 'rejected');

        Notification::assertSentTo($owner, OrganizationMemberInviteResponded::class, function ($notification) use ($owner) {
            return $notification->toArray($owner)['meta']['status'] === 'rejected';
        });
        Notification::assertNotSentTo($owner, OrganizationMemberJoined::class);
    }

    public function test_member_role_cannot_access_publish_options_for_organization(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Publish Roles Org',
            'slug' => 'publish-roles-org',
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
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $memberToken = auth('api')->login($member);

        $memberResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/publish/options');

        $memberResponse->assertOk()->assertJsonMissing([
            'slug' => $organization->slug,
        ]);

        $editorToken = auth('api')->login($editor);

        $editorResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$editorToken,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/publish/options');

        $editorResponse->assertOk()->assertJsonFragment([
            'slug' => $organization->slug,
        ]);
    }

    public function test_owner_can_cancel_pending_member_invite(): void
    {
        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Cancel Invite Org',
            'slug' => 'cancel-invite-org',
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
            'user_id' => $candidate->id,
            'role' => 'editor',
            'status' => 'pending',
            'invited_by_user_id' => $owner->id,
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/members/{$candidate->id}/invite")
            ->assertOk();

        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $candidate->id,
            'status' => 'pending',
        ]);
    }

    public function test_user_can_mark_invite_notification_as_accepted_state(): void
    {
        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Accepted State Org',
            'slug' => 'invite-accepted-state-org',
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
        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members", [
            'user_id' => $candidate->id,
            'role' => 'editor',
        ])->assertCreated();

        $notificationId = (string) $candidate->notifications()->latest()->value('id');
        $this->assertNotEmpty($notificationId);

        $candidateToken = auth('api')->login($candidate);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$candidateToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/notifications/{$notificationId}/invite-accepted")
            ->assertOk();

        $notification = $candidate->notifications()->where('id', $notificationId)->firstOrFail();
        $this->assertSame('accepted', $notification->data['invite_status'] ?? null);
        $this->assertNotNull($notification->read_at);
    }

    public function test_owner_and_admin_can_ban_member_while_member_cannot(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $target = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Ban Org',
            'slug' => 'ban-org',
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
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $target->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $memberToken = auth('api')->login($member);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$memberToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members/{$target->id}/ban")
            ->assertStatus(403);

        $adminToken = auth('api')->login($admin);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members/{$target->id}/ban")
            ->assertOk()
            ->assertJsonPath('member.status', 'banned');

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $target->id,
            'status' => 'banned',
        ]);
    }

    public function test_banned_user_cannot_join_again(): void
    {
        $owner = User::factory()->create();
        $target = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Ban Join Org',
            'slug' => 'ban-join-org',
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
            'user_id' => $target->id,
            'role' => 'member',
            'status' => 'banned',
        ]);

        $targetToken = auth('api')->login($target);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$targetToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/join-request")
            ->assertStatus(403);
    }

    public function test_owner_can_expel_member_and_invite_again_later(): void
    {
        $owner = User::factory()->create();
        $target = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Expel Org',
            'slug' => 'expel-org',
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
            'user_id' => $target->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/members/{$target->id}")
            ->assertOk();

        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $target->id,
        ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members", [
            'user_id' => $target->id,
            'role' => 'member',
        ])->assertCreated();

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $target->id,
            'status' => 'pending',
        ]);
    }

    public function test_banned_member_cannot_be_removed(): void
    {
        $owner = User::factory()->create();
        $target = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Permanent Ban Org',
            'slug' => 'permanent-ban-org',
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
            'user_id' => $target->id,
            'role' => 'member',
            'status' => 'banned',
        ]);

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/members/{$target->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $target->id,
            'status' => 'banned',
        ]);
    }

    public function test_admin_cannot_ban_or_expel_other_admin(): void
    {
        $owner = User::factory()->create();
        $adminA = User::factory()->create();
        $adminB = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Admin Rules Org',
            'slug' => 'admin-rules-org',
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
            'user_id' => $adminA->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $adminB->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $adminToken = auth('api')->login($adminA);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/members/{$adminB->id}/ban")
            ->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/organizations/{$organization->slug}/members/{$adminB->id}")
            ->assertStatus(403);
    }

    public function test_owner_can_transfer_community_ownership_when_target_accepts(): void
    {
        $owner = User::factory()->create();
        $target = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Transfer Ownership Org',
            'slug' => 'transfer-ownership-org',
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
            'user_id' => $target->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $ownerToken = auth('api')->login($owner);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/owner-transfer", [
            'target_user_id' => $target->id,
        ])->assertOk();

        $targetToken = auth('api')->login($target);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$targetToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/owner-transfer/respond", [
            'decision' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'owner_user_id' => $target->id,
        ]);

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $target->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_organization_name_must_be_unique_on_create_and_update(): void
    {
        $owner = User::factory()->create();
        $ownerToken = auth('api')->login($owner);

        $firstCreate = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/organizations', [
            'name' => 'Nome Único Comunidade',
            'description' => 'Primeira comunidade',
        ]);

        $firstCreate->assertCreated();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/organizations', [
            'name' => 'Nome Único Comunidade',
            'description' => 'Tentativa duplicada',
        ])->assertStatus(422);

        $secondCreate = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/organizations', [
            'name' => 'Outra Comunidade',
            'description' => 'Comunidade secundária',
        ]);

        $secondCreate->assertCreated();
        $secondSlug = (string) $secondCreate->json('organization.slug');

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/organizations/{$secondSlug}", [
            'name' => 'Nome Único Comunidade',
        ])->assertStatus(422);
    }

    public function test_editor_cannot_create_playlist_and_release_year_is_required(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Playlist Permission Org',
            'slug' => 'playlist-permission-org',
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
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $editorToken = auth('api')->login($editor);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$editorToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/playlists", [
            'title' => 'Playlist de Dublador',
            'release_year' => 2025,
        ])->assertStatus(403);

        $adminToken = auth('api')->login($admin);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/playlists", [
            'title' => 'Playlist sem ano',
        ])->assertStatus(422);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/organizations/{$organization->slug}/playlists", [
            'title' => 'Playlist com ano',
            'release_year' => 2026,
        ])->assertCreated();
    }
}
