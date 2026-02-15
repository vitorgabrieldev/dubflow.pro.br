<?php

namespace Tests\Feature;

use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Support\OrganizationAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostPermissionMatrixApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_edit_and_delete_permission_matrix(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $editorAuthor = User::factory()->create();
        $editorOther = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Post Permission Matrix Org',
            'slug' => 'post-permission-matrix-org',
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
            'user_id' => $editorAuthor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $editorOther->id,
            'role' => 'editor',
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

        $post = DubbingPost::create([
            'organization_id' => $organization->id,
            'author_user_id' => $editorAuthor->id,
            'title' => 'Post da matriz',
            'media_path' => 'dubbing-media/matrix.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
            'published_at' => now(),
        ]);

        $this->assertTrue(OrganizationAccess::canEditPost($owner, $post));
        $this->assertTrue(OrganizationAccess::canEditPost($admin, $post));

        $tokenFor = static fn (User $user): string => auth('api')->login($user);

        // Owner/Admin podem editar qualquer post.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($owner),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Editado pelo owner',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($admin),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Editado pelo admin',
        ])->assertOk();

        // Editor autor pode editar.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($editorAuthor),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Editado pelo editor autor',
        ])->assertOk();

        // Editor não autor, member e outsider não podem editar.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($editorOther),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Tentativa editor não autor',
        ])->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($member),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Tentativa member',
        ])->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($outsider),
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$post->id}", [
            'title' => 'Tentativa outsider',
        ])->assertStatus(403);

        // Editor autor não pode deletar.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($editorAuthor),
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$post->id}")
            ->assertStatus(403);

        // Member e outsider também não podem deletar.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($member),
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$post->id}")
            ->assertStatus(403);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($outsider),
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$post->id}")
            ->assertStatus(403);

        // Admin pode deletar.
        $this->withHeaders([
            'Authorization' => 'Bearer '.$tokenFor($admin),
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$post->id}")
            ->assertOk();

        $this->assertDatabaseMissing('dubbing_posts', [
            'id' => $post->id,
        ]);
    }
}
