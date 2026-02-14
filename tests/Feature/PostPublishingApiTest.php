<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Playlist;
use App\Models\User;
use App\Notifications\OrganizationPostCommented;
use App\Notifications\OrganizationPublishedPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostPublishingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_editor_can_publish_episode_with_media_assets(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Post Org',
            'slug' => 'post-org',
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
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist Teste',
            'slug' => 'playlist-teste',
            'visibility' => 'public',
        ]);

        $token = auth('api')->login($editor);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Episódio 01',
            'description' => 'Publicação de teste',
            'playlist_id' => $playlist->id,
            'work_title' => 'Naruto',
            'language_code' => 'pt-BR',
            'allow_comments' => true,
            'media_assets' => [
                UploadedFile::fake()->create('episode-audio.mp3', 128, 'audio/mpeg'),
                UploadedFile::fake()->image('cover.jpg'),
            ],
        ]);

        $response->assertCreated()->assertJsonPath('post.title', 'Episódio 01');
        $this->assertDatabaseHas('dubbing_posts', [
            'organization_id' => $organization->id,
            'title' => 'Episódio 01',
        ]);
    }

    public function test_editor_can_publish_standalone_episode_without_playlist(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Standalone Org',
            'slug' => 'standalone-org',
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
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $token = auth('api')->login($editor);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Episódio Avulso',
            'description' => 'Publicação sem playlist',
            'work_title' => 'Obra Avulsa',
            'language_code' => 'pt-BR',
            'allow_comments' => true,
            'media_assets' => [
                UploadedFile::fake()->create('voice-over.mp3', 128, 'audio/mpeg'),
            ],
        ]);

        $response->assertCreated()->assertJsonPath('post.title', 'Episódio Avulso');
        $this->assertDatabaseHas('dubbing_posts', [
            'organization_id' => $organization->id,
            'title' => 'Episódio Avulso',
            'playlist_id' => null,
        ]);
    }

    public function test_comments_allow_only_two_levels(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $commenter = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Comments Org',
            'slug' => 'comments-org',
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

        $postResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Post de Comentários',
            'work_title' => 'Obra Teste',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('audio.mp3', 128, 'audio/mpeg'),
            ],
        ]);

        $postResponse->assertCreated();
        $postId = (int) $postResponse->json('post.id');

        $commenterToken = auth('api')->login($commenter);

        $root = $this->withHeaders([
            'Authorization' => 'Bearer '.$commenterToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Comentário raiz',
        ]);
        $root->assertCreated();

        $rootId = (int) $root->json('comment.id');

        $reply = $this->withHeaders([
            'Authorization' => 'Bearer '.$commenterToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Primeira resposta',
            'parent_id' => $rootId,
        ]);
        $reply->assertCreated();

        $replyId = (int) $reply->json('comment.id');

        $nestedReply = $this->withHeaders([
            'Authorization' => 'Bearer '.$commenterToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Resposta de terceiro nível',
            'parent_id' => $replyId,
        ]);

        $nestedReply->assertStatus(422);
    }

    public function test_active_members_receive_notification_when_episode_is_published(): void
    {
        Storage::fake('public');
        Notification::fake();

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $member = User::factory()->create();
        $follower = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Notify Org',
            'slug' => 'notify-org',
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
            'user_id' => $editor->id,
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
        $organization->followers()->attach($follower->id);

        $token = auth('api')->login($editor);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Episódio com notificação',
            'work_title' => 'Obra X',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
            ],
        ]);

        $response->assertCreated();

        Notification::assertSentTo($owner, OrganizationPublishedPost::class);
        Notification::assertSentTo($member, OrganizationPublishedPost::class);
        Notification::assertSentTo($follower, OrganizationPublishedPost::class);
        Notification::assertNotSentTo($editor, OrganizationPublishedPost::class);
    }

    public function test_active_members_receive_notification_when_new_comment_is_added(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $member = User::factory()->create();
        $follower = User::factory()->create();
        $commenter = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Comments Notify Org',
            'slug' => 'comments-notify-org',
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
        $organization->followers()->attach($follower->id);

        $ownerToken = auth('api')->login($owner);
        $postResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Post para notificação de comentário',
            'work_title' => 'Obra Y',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
            ],
        ]);
        $postResponse->assertCreated();
        $postId = (int) $postResponse->json('post.id');

        Notification::fake();
        $commenterToken = auth('api')->login($commenter);

        $commentResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$commenterToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Chegou comentário novo',
        ]);

        $commentResponse->assertCreated();

        Notification::assertSentTo($owner, OrganizationPostCommented::class);
        Notification::assertSentTo($member, OrganizationPostCommented::class);
        Notification::assertSentTo($follower, OrganizationPostCommented::class);
        Notification::assertNotSentTo($commenter, OrganizationPostCommented::class);
    }

    public function test_post_author_as_editor_can_edit_but_cannot_delete_and_loses_access_when_role_changes(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $author = User::factory()->create();
        $admin = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Author Post Rules Org',
            'slug' => 'author-post-rules-org',
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
        $authorMembership = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $author->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $authorToken = auth('api')->login($author);
        $create = $this->withHeaders([
            'Authorization' => 'Bearer '.$authorToken,
            'Accept' => 'application/json',
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Episódio do Autor',
            'work_title' => 'Obra Autor',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('author-episode.mp3', 128, 'audio/mpeg'),
            ],
        ]);

        $create->assertCreated();
        $postId = (int) $create->json('post.id');

        $this->withHeaders([
            'Authorization' => 'Bearer '.$authorToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$postId}", [
            'title' => 'Episódio do Autor Atualizado',
            'show_likes_count' => false,
            'show_views_count' => false,
        ])->assertOk()->assertJsonPath('post.title', 'Episódio do Autor Atualizado');

        $this->withHeaders([
            'Authorization' => 'Bearer '.$authorToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$postId}")
            ->assertStatus(403);

        $this->assertDatabaseHas('dubbing_posts', [
            'id' => $postId,
            'title' => 'Episódio do Autor Atualizado',
            'author_user_id' => $author->id,
        ]);

        $authorMembership->role = 'member';
        $authorMembership->save();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$authorToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$postId}", [
            'title' => 'Tentativa sem cargo',
        ])->assertStatus(403);

        $authorMembership->delete();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$authorToken,
            'Accept' => 'application/json',
        ])->patchJson("/api/v1/posts/{$postId}", [
            'title' => 'Tentativa fora da comunidade',
        ])->assertStatus(403);

        $adminToken = auth('api')->login($admin);
        $this->withHeaders([
            'Authorization' => 'Bearer '.$adminToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/posts/{$postId}")
            ->assertOk();

        $this->assertDatabaseMissing('dubbing_posts', [
            'id' => $postId,
        ]);
    }
}
