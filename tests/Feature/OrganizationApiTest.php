<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
}
