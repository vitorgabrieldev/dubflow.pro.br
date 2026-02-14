<?php

namespace Tests\Unit;

use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Support\OrganizationAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_manage_and_publish(): void
    {
        $owner = User::factory()->create();
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Owner',
            'slug' => 'org-owner',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->assertTrue(OrganizationAccess::canManageOrganization($owner, $organization));
        $this->assertTrue(OrganizationAccess::canPublish($owner, $organization));
        $this->assertTrue(OrganizationAccess::isActiveMember($owner, $organization));
    }

    public function test_editor_can_publish_but_cannot_manage_members(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Editor',
            'slug' => 'org-editor',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->assertFalse(OrganizationAccess::canManageOrganization($editor, $organization));
        $this->assertTrue(OrganizationAccess::canPublish($editor, $organization));
    }

    public function test_author_can_manage_own_post_even_without_publish_role(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Author',
            'slug' => 'org-author',
            'is_public' => true,
        ]);

        $post = DubbingPost::create([
            'organization_id' => $organization->id,
            'author_user_id' => $author->id,
            'title' => 'Episódio Teste',
            'media_path' => 'dubbing-media/test.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
        ]);

        $this->assertTrue(OrganizationAccess::canManagePost($author, $post));
    }
}

