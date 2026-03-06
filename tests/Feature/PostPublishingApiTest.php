<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Playlist;
use App\Models\PlaylistSeason;
use App\Models\DubbingPost;
use App\Models\User;
use App\Notifications\CommentReplyReceived;
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
        Storage::fake('local');

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
        Storage::fake('local');

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

    public function test_credit_name_matching_links_platform_user_and_prefers_stage_name(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $contributor = User::factory()->create([
            'name' => 'João Silva',
            'stage_name' => 'Voz de Ouro',
        ]);

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Credits Org',
            'slug' => 'credits-org',
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
            'title' => 'Episódio com colaboradores',
            'description' => 'Teste de créditos',
            'work_title' => 'Projeto X',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
            ],
            'credits' => [
                [
                    'character_name' => 'Direção',
                    'dubber_name' => 'João Silva',
                ],
            ],
        ]);

        $response->assertCreated();
        $postId = (int) $response->json('post.id');

        $this->assertDatabaseHas('post_credits', [
            'post_id' => $postId,
            'character_name' => 'Direção',
            'dubber_user_id' => $contributor->id,
            'dubber_name' => 'Voz de Ouro',
        ]);
    }

    public function test_comments_allow_only_two_levels(): void
    {
        Storage::fake('public');
        Storage::fake('local');

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
        Storage::fake('local');
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
        Storage::fake('local');

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

    public function test_comment_author_receives_notification_when_their_comment_gets_a_reply(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Notification::fake();

        $owner = User::factory()->create();
        $commentAuthor = User::factory()->create();
        $replier = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Reply Notify Org',
            'slug' => 'reply-notify-org',
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
            'title' => 'Post para resposta de comentário',
            'work_title' => 'Obra Z',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
            ],
        ]);
        $postResponse->assertCreated();
        $postId = (int) $postResponse->json('post.id');

        Notification::fake();

        $commentAuthorToken = auth('api')->login($commentAuthor);
        $rootCommentResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$commentAuthorToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Comentário raiz do autor',
        ]);
        $rootCommentResponse->assertCreated();
        $rootCommentId = (int) $rootCommentResponse->json('comment.id');

        Notification::fake();

        $replierToken = auth('api')->login($replier);
        $replyResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$replierToken,
        ])->postJson("/api/v1/posts/{$postId}/comments", [
            'body' => 'Resposta ao comentário raiz',
            'parent_id' => $rootCommentId,
        ]);
        $replyResponse->assertCreated();

        Notification::assertSentTo($commentAuthor, CommentReplyReceived::class);
        Notification::assertNotSentTo($replier, CommentReplyReceived::class);
    }

    public function test_post_author_as_editor_can_edit_but_cannot_delete_and_loses_access_when_role_changes(): void
    {
        Storage::fake('public');
        Storage::fake('local');

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

    public function test_editor_can_publish_community_episode_with_full_payload_and_relationships(): void
    {
        $this->fakeMediaDisks();

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $collaborator = User::factory()->create();
        $creditUser = User::factory()->create([
            'name' => 'Maria dubladora',
            'stage_name' => 'Mary Voz',
        ]);

        $organization = $this->createOrganizationWithPublisher($owner, $editor, 'full-community-org');

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Saga principal',
            'slug' => 'saga-principal',
            'visibility' => 'public',
        ]);

        $editorToken = auth('api')->login($editor);

        $response = $this->withHeaders($this->authHeaders($editorToken))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', [
                'title' => 'Episódio completo',
                'description' => 'Payload com todos os campos relevantes.',
                'playlist_id' => $playlist->id,
                'season_number' => 3,
                'season_title' => 'Terceira Temporada',
                'duration_seconds' => 280,
                'visibility' => 'private',
                'allow_comments' => true,
                'show_likes_count' => false,
                'show_views_count' => false,
                'language_code' => 'pt-BR',
                'work_title' => 'Projeto Completo',
                'content_license' => 'allow_remix_with_credit',
                'tags' => ['Ação', 'Drama', 'Ação'],
                'collaborator_ids' => [$editor->id, $collaborator->id, $collaborator->id],
                'credits' => [
                    [
                        'character_name' => 'Narradora',
                        'dubber_user_id' => $creditUser->id,
                    ],
                    [
                        'character_name' => 'Vilã',
                        'dubber_name' => 'Maria dubladora',
                    ],
                ],
                'thumbnail' => UploadedFile::fake()->image('thumb.jpg'),
                'media_assets' => [
                    UploadedFile::fake()->create('main-audio.mp3', 128, 'audio/mpeg'),
                    UploadedFile::fake()->image('capa.jpg'),
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Post criado. Publicacao pendente de aprovacao dos colaboradores.');

        $postId = (int) $response->json('post.id');
        $post = DubbingPost::query()->with(['season', 'tags', 'credits'])->findOrFail($postId);

        $metadata = is_array($post->metadata) ? $post->metadata : [];

        $this->assertSame($organization->id, $post->organization_id);
        $this->assertSame($playlist->id, $post->playlist_id);
        $this->assertSame('private', $post->visibility);
        $this->assertSame('allow_remix_with_credit', $post->content_license);
        $this->assertSame(280, $post->duration_seconds);
        $this->assertSame('audio', $post->media_type);
        $this->assertStringStartsWith('dubbing-thumbnails/', (string) $post->thumbnail_path);
        $this->assertNull($post->published_at);

        $this->assertSame('community', $metadata['publish_target'] ?? null);
        $this->assertTrue((bool) ($metadata['requires_collaborator_approval'] ?? false));
        $this->assertFalse((bool) ($metadata['display_metrics']['show_likes'] ?? true));
        $this->assertFalse((bool) ($metadata['display_metrics']['show_views'] ?? true));

        $this->assertNotNull($post->season);
        $this->assertSame(3, $post->season?->season_number);
        $this->assertSame('Terceira Temporada', $post->season?->title);
        $this->assertCount(2, $post->tags);
        $this->assertCount(2, $post->credits);

        $this->assertDatabaseHas('post_collaborators', [
            'post_id' => $postId,
            'user_id' => $collaborator->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseMissing('post_collaborators', [
            'post_id' => $postId,
            'user_id' => $editor->id,
        ]);
    }

    public function test_owner_can_publish_profile_episode_and_reuse_same_hidden_profile_space(): void
    {
        $this->fakeMediaDisks();

        $owner = User::factory()->create([
            'name' => 'Perfil User',
            'stage_name' => 'Voz Perfil',
        ]);

        $ownerToken = auth('api')->login($owner);

        $first = $this->withHeaders($this->authHeaders($ownerToken))
            ->post('/api/v1/posts/profile', [
                'title' => 'Ep perfil 01',
                'description' => 'Primeiro episódio de perfil.',
                'work_title' => 'Perfil Work',
                'language_code' => 'pt-BR',
                'media_assets' => [
                    UploadedFile::fake()->create('perfil-1.mp3', 128, 'audio/mpeg'),
                ],
            ]);

        $first->assertCreated()->assertJsonPath('post.metadata.publish_target', 'profile');

        $second = $this->withHeaders($this->authHeaders($ownerToken))
            ->post('/api/v1/posts/profile', [
                'title' => 'Ep perfil 02',
                'description' => 'Segundo episódio de perfil.',
                'work_title' => 'Perfil Work',
                'language_code' => 'pt-BR',
                'media_assets' => [
                    UploadedFile::fake()->create('perfil-2.mp3', 128, 'audio/mpeg'),
                ],
            ]);

        $second->assertCreated()->assertJsonPath('post.metadata.publish_target', 'profile');

        $firstPost = DubbingPost::query()->findOrFail((int) $first->json('post.id'));
        $secondPost = DubbingPost::query()->findOrFail((int) $second->json('post.id'));

        $profileOrganizations = Organization::query()
            ->where('owner_user_id', $owner->id)
            ->get()
            ->filter(static function (Organization $organization): bool {
                $settings = is_array($organization->settings) ? $organization->settings : [];

                return ($settings['is_profile_space'] ?? false) === true;
            })
            ->values();

        $this->assertCount(1, $profileOrganizations);
        $this->assertSame($firstPost->organization_id, $secondPost->organization_id);
        $this->assertSame($profileOrganizations->first()?->id, $firstPost->organization_id);
        $this->assertFalse((bool) $profileOrganizations->first()?->is_public);
    }

    public function test_profile_publish_rejects_playlist_and_season_fields(): void
    {
        $this->fakeMediaDisks();

        $profileOwner = User::factory()->create();
        $communityOwner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $communityOwner->id,
            'name' => 'Org externa',
            'slug' => 'org-externa',
            'is_public' => true,
        ]);

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist externa',
            'slug' => 'playlist-externa',
            'visibility' => 'public',
        ]);

        $season = PlaylistSeason::create([
            'playlist_id' => $playlist->id,
            'season_number' => 1,
            'title' => 'Temporada externa',
            'created_by_user_id' => $communityOwner->id,
        ]);

        $token = auth('api')->login($profileOwner);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/posts/profile', [
                'title' => 'Post perfil inválido',
                'work_title' => 'Perfil',
                'language_code' => 'pt-BR',
                'playlist_id' => $playlist->id,
                'season_id' => $season->id,
                'season_number' => 1,
                'media_assets' => [
                    UploadedFile::fake()->create('perfil-invalid.mp3', 128, 'audio/mpeg'),
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Publicações de perfil não aceitam comunidade, playlist ou temporada.');
    }

    public function test_publish_validation_covers_required_fields_and_invalid_values_on_create(): void
    {
        $this->fakeMediaDisks();

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $organization = $this->createOrganizationWithPublisher($owner, $editor, 'validation-org');
        $token = auth('api')->login($editor);

        $cases = [
            [
                'payload' => ['title' => null],
                'error' => 'title',
            ],
            [
                'payload' => ['language_code' => null],
                'error' => 'language_code',
            ],
            [
                'payload' => ['work_title' => null],
                'error' => 'work_title',
            ],
            [
                'payload' => ['visibility' => 'friends-only'],
                'error' => 'visibility',
            ],
            [
                'payload' => ['content_license' => 'forbidden'],
                'error' => 'content_license',
            ],
            [
                'payload' => ['duration_seconds' => 3601],
                'error' => 'duration_seconds',
            ],
            [
                'payload' => ['tags' => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']],
                'error' => 'tags',
            ],
            [
                'payload' => [
                    'media_assets' => [
                        UploadedFile::fake()->create('not-supported.txt', 32, 'text/plain'),
                    ],
                ],
                'error' => 'media_assets.0',
            ],
        ];

        foreach ($cases as $case) {
            $response = $this->withHeaders($this->authHeaders($token))
                ->post('/api/v1/organizations/'.$organization->slug.'/posts', $this->baseCreatePayload($case['payload']));

            $response->assertStatus(422)->assertJsonValidationErrors([$case['error']]);
        }
    }

    public function test_create_requires_media_assets_but_accepts_legacy_media_field(): void
    {
        $this->fakeMediaDisks();

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $organization = $this->createOrganizationWithPublisher($owner, $editor, 'legacy-media-org');
        $token = auth('api')->login($editor);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', [
                'title' => 'Sem mídia',
                'work_title' => 'Obra sem mídia',
                'language_code' => 'pt-BR',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Envie ao menos um arquivo de mídia.');

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', [
                'title' => 'Com mídia legada',
                'work_title' => 'Obra com campo legado',
                'language_code' => 'pt-BR',
                'media' => UploadedFile::fake()->create('legacy.mp3', 128, 'audio/mpeg'),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('dubbing_posts', [
            'organization_id' => $organization->id,
            'title' => 'Com mídia legada',
        ]);
    }

    public function test_publish_rejects_playlist_from_another_organization(): void
    {
        $this->fakeMediaDisks();

        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();
        $editor = User::factory()->create();

        $organizationA = $this->createOrganizationWithPublisher($ownerA, $editor, 'org-a-playlist-check');
        $organizationB = Organization::create([
            'owner_user_id' => $ownerB->id,
            'name' => 'Org B',
            'slug' => 'org-b-playlist-check',
            'is_public' => true,
        ]);
        OrganizationMember::create([
            'organization_id' => $organizationB->id,
            'user_id' => $ownerB->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $foreignPlaylist = Playlist::create([
            'organization_id' => $organizationB->id,
            'title' => 'Playlist B',
            'slug' => 'playlist-b',
            'visibility' => 'public',
        ]);

        $token = auth('api')->login($editor);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/organizations/'.$organizationA->slug.'/posts', $this->baseCreatePayload([
                'playlist_id' => $foreignPlaylist->id,
            ]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Playlist nao pertence a organizacao.');
    }

    public function test_publish_rejects_season_that_does_not_belong_to_selected_playlist(): void
    {
        $this->fakeMediaDisks();

        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $organization = $this->createOrganizationWithPublisher($owner, $editor, 'season-mismatch-org');

        $playlistA = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist A',
            'slug' => 'playlist-a',
            'visibility' => 'public',
        ]);

        $playlistB = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist B',
            'slug' => 'playlist-b',
            'visibility' => 'public',
        ]);

        $seasonFromB = PlaylistSeason::create([
            'playlist_id' => $playlistB->id,
            'season_number' => 9,
            'title' => 'Temporada B',
            'created_by_user_id' => $owner->id,
        ]);

        $token = auth('api')->login($editor);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', $this->baseCreatePayload([
                'playlist_id' => $playlistA->id,
                'season_id' => $seasonFromB->id,
            ]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'A temporada selecionada não pertence à playlist.');
    }

    public function test_profile_create_also_validates_required_fields_and_requires_media(): void
    {
        $this->fakeMediaDisks();

        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/posts/profile', [
                'title' => null,
                'work_title' => 'Perfil',
                'language_code' => 'pt-BR',
                'media_assets' => [
                    UploadedFile::fake()->create('perfil-audio.mp3', 128, 'audio/mpeg'),
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);

        $this->withHeaders($this->authHeaders($token))
            ->post('/api/v1/posts/profile', [
                'title' => 'Sem mídia no perfil',
                'work_title' => 'Perfil',
                'language_code' => 'pt-BR',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Envie ao menos um arquivo de mídia.');
    }

    private function createOrganizationWithPublisher(User $owner, User $publisher, string $slug): Organization
    {
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org '.$slug,
            'slug' => $slug,
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        if ($owner->id !== $publisher->id) {
            OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $publisher->id,
                'role' => 'editor',
                'status' => 'active',
                'joined_at' => now(),
            ]);
        }

        return $organization;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function baseCreatePayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Payload base',
            'description' => 'Descrição base',
            'work_title' => 'Obra base',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('base-audio.mp3', 128, 'audio/mpeg'),
            ],
        ], $overrides);
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

    private function fakeMediaDisks(): void
    {
        Storage::fake('public');
        Storage::fake('local');
    }
}
