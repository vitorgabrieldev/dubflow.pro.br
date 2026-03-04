<?php

namespace Tests\Feature;

use App\Models\DubbingPost;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AdminPermissionSeeder;
use Database\Seeders\AdminRoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminContentModulesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_crud_platform_users(): void
    {
        $admin = $this->createSuperAdminUser();
        $token = $this->loginAndGetToken($admin->email, 'password123');

        $create = $this->withToken($token)->postJson('/api/v1/admin/platform-users', [
            'name' => 'Usuário Plataforma 1',
            'email' => 'platform.user.1@example.com',
            'password_random' => true,
            'is_active' => true,
            'is_private' => false,
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.email', 'platform.user.1@example.com');

        $platformUserUuid = (string) $create->json('data.uuid');

        $this->withToken($token)->getJson('/api/v1/admin/platform-users/'.$platformUserUuid)
            ->assertOk()
            ->assertJsonPath('data.uuid', $platformUserUuid);

        $this->withToken($token)->postJson('/api/v1/admin/platform-users/'.$platformUserUuid, [
            'is_private' => true,
        ])->assertOk()->assertJsonPath('data.is_private', true);

        $this->withToken($token)->deleteJson('/api/v1/admin/platform-users/'.$platformUserUuid)
            ->assertNoContent();

        $this->withToken($token)->getJson('/api/v1/admin/platform-users?is_active=0&search=platform.user.1@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'platform.user.1@example.com');
    }

    public function test_super_admin_can_permanently_delete_platform_user_with_password_validation(): void
    {
        $admin = $this->createSuperAdminUser();
        $token = $this->loginAndGetToken($admin->email, 'password123');

        $platformUser = User::factory()->create([
            'email' => 'platform.delete.me@example.com',
            'password' => Hash::make('senha-forte-123'),
            'is_active' => true,
        ]);

        $this->withToken($token)->deleteJson('/api/v1/admin/platform-users/'.$platformUser->uuid.'/permanent', [
            'password' => 'senha-errada-123',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertDatabaseHas('users', [
            'id' => $platformUser->id,
            'email' => 'platform.delete.me@example.com',
        ]);

        $this->withToken($token)->deleteJson('/api/v1/admin/platform-users/'.$platformUser->uuid.'/permanent', [
            'password' => 'senha-forte-123',
        ])->assertNoContent();

        $this->assertSoftDeleted('users', [
            'id' => $platformUser->id,
        ]);

        $this->withToken($token)->getJson('/api/v1/admin/platform-users?search=platform.delete.me@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'platform.delete.me@example.com')
            ->assertJsonPath('data.0.is_deleted', true);
    }

    public function test_super_admin_can_crud_communities_and_playlists_with_soft_delete(): void
    {
        $admin = $this->createSuperAdminUser();
        $owner = User::factory()->create([
            'email' => 'community.owner@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $token = $this->loginAndGetToken($admin->email, 'password123');

        $createCommunity = $this->withToken($token)->postJson('/api/v1/admin/communities', [
            'owner_uuid' => $owner->uuid,
            'name' => 'Comunidade de Teste',
            'slug' => 'comunidade-de-teste',
            'description' => 'Descrição inicial',
            'is_public' => true,
            'is_verified' => false,
        ]);

        $createCommunity->assertCreated()->assertJsonPath('data.name', 'Comunidade de Teste');

        $communityId = (string) $createCommunity->json('data.uuid');

        $this->withToken($token)->postJson('/api/v1/admin/communities/'.$communityId, [
            'name' => 'Comunidade de Teste Atualizada',
            'is_verified' => true,
        ])->assertOk()->assertJsonPath('data.is_verified', true);

        $createPlaylist = $this->withToken($token)->postJson('/api/v1/admin/playlists', [
            'organization_id' => (int) $communityId,
            'title' => 'Playlist Teste',
            'slug' => 'playlist-teste',
            'description' => 'Desc playlist',
            'work_title' => 'Obra',
            'release_year' => 2025,
            'visibility' => 'public',
        ]);

        $createPlaylist->assertCreated()->assertJsonPath('data.title', 'Playlist Teste');

        $playlistId = (string) $createPlaylist->json('data.uuid');

        $this->withToken($token)->postJson('/api/v1/admin/playlists/'.$playlistId, [
            'title' => 'Playlist Teste Atualizada',
        ])->assertOk()->assertJsonPath('data.title', 'Playlist Teste Atualizada');

        $this->withToken($token)->deleteJson('/api/v1/admin/playlists/'.$playlistId)
            ->assertNoContent();

        $this->withToken($token)->getJson('/api/v1/admin/playlists?with_deleted=1&search=Playlist%20Teste%20Atualizada')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.deleted_at', fn ($value) => ! empty($value));

        $this->withToken($token)->deleteJson('/api/v1/admin/communities/'.$communityId)
            ->assertNoContent();

        $this->withToken($token)->getJson('/api/v1/admin/communities?with_deleted=1&search=Comunidade%20de%20Teste%20Atualizada')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.deleted_at', fn ($value) => ! empty($value));
    }

    public function test_super_admin_can_list_and_view_publications_module(): void
    {
        $admin = $this->createSuperAdminUser();
        $author = User::factory()->create([
            'email' => 'post.author@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $token = $this->loginAndGetToken($admin->email, 'password123');

        $community = $this->withToken($token)->postJson('/api/v1/admin/communities', [
            'owner_uuid' => $author->uuid,
            'name' => 'Comunidade Publicações',
            'slug' => 'comunidade-publicacoes',
            'is_public' => true,
            'is_verified' => false,
        ])->assertCreated();

        $communityId = (int) $community->json('data.uuid');

        $post = DubbingPost::query()->create([
            'organization_id' => $communityId,
            'author_user_id' => $author->id,
            'title' => 'Publicação do módulo admin',
            'description' => 'Descrição da publicação de teste',
            'media_path' => 'posts/teste-admin.mp4',
            'media_type' => 'video',
            'media_size_bytes' => 1024,
            'thumbnail_path' => 'thumbs/teste-admin.jpg',
            'duration_seconds' => 30,
            'visibility' => 'public',
            'allow_comments' => true,
            'language_code' => 'pt-BR',
            'content_license' => 'all_rights_reserved',
            'published_at' => now(),
            'metadata' => [
                'work_title' => 'Obra de Teste',
            ],
        ]);

        $this->withToken($token)->getJson('/api/v1/admin/posts?search=Publicação%20do%20módulo%20admin')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $post->id);

        $this->withToken($token)->getJson('/api/v1/admin/posts/'.$post->id)
            ->assertOk()
            ->assertJsonPath('data.id', $post->id)
            ->assertJsonPath('data.title', 'Publicação do módulo admin')
            ->assertJsonPath('data.site_preview_url', fn ($value) => is_string($value) && str_contains($value, '/pt-BR/post/'.$post->id));
    }

    public function test_super_admin_can_crud_opportunities_comments_and_notifications(): void
    {
        $admin = $this->createSuperAdminUser();
        $author = User::factory()->create([
            'email' => 'author@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $token = $this->loginAndGetToken($admin->email, 'password123');

        $createCommunity = $this->withToken($token)->postJson('/api/v1/admin/communities', [
            'owner_uuid' => $author->uuid,
            'name' => 'Comunidade Oportunidades',
            'slug' => 'comunidade-oportunidades',
            'is_public' => true,
            'is_verified' => false,
        ])->assertCreated();

        $communityId = (int) $createCommunity->json('data.uuid');

        $createOpportunity = $this->withToken($token)->postJson('/api/v1/admin/opportunities', [
            'organization_id' => $communityId,
            'created_by_user_uuid' => $author->uuid,
            'title' => 'Oportunidade Teste',
            'description' => 'Descrição da oportunidade',
            'visibility' => 'external',
            'status' => 'draft',
            'starts_at' => now()->addDay()->toAtomString(),
            'ends_at' => now()->addDays(5)->toAtomString(),
            'results_release_at' => now()->addDays(7)->toAtomString(),
            'characters' => [
                [
                    'name' => 'Personagem 1',
                    'description' => 'Descrição',
                    'expectations' => 'Expectativas',
                    'appearance_estimate' => 'coadjuvante',
                ],
            ],
        ]);

        $createOpportunity->assertCreated()->assertJsonPath('data.title', 'Oportunidade Teste');

        $opportunityId = (string) $createOpportunity->json('data.uuid');

        $this->withToken($token)->postJson('/api/v1/admin/opportunities/'.$opportunityId, [
            'status' => 'published',
            'starts_at' => now()->addDay()->toAtomString(),
            'ends_at' => now()->addDays(5)->toAtomString(),
            'results_release_at' => now()->addDays(7)->toAtomString(),
        ])->assertOk()->assertJsonPath('data.status', 'published');

        $post = DubbingPost::query()->create([
            'organization_id' => $communityId,
            'author_user_id' => $author->id,
            'title' => 'Post para comentário admin',
            'description' => null,
            'media_path' => 'posts/teste.mp4',
            'media_type' => 'video',
            'media_size_bytes' => 1024,
            'duration_seconds' => 30,
            'visibility' => 'public',
            'allow_comments' => true,
            'language_code' => 'pt-BR',
            'content_license' => 'all_rights_reserved',
            'published_at' => now(),
        ]);

        $createComment = $this->withToken($token)->postJson('/api/v1/admin/comments', [
            'post_id' => $post->id,
            'user_uuid' => $author->uuid,
            'body' => 'Comentário criado pelo admin.',
        ]);

        $createComment->assertCreated()->assertJsonPath('data.post_id', $post->id);

        $commentId = (string) $createComment->json('data.uuid');

        $this->withToken($token)->postJson('/api/v1/admin/comments/'.$commentId, [
            'body' => 'Comentário atualizado pelo admin.',
        ])->assertOk()->assertJsonPath('data.body', 'Comentário atualizado pelo admin.');

        $createNotification = $this->withToken($token)->postJson('/api/v1/admin/notifications', [
            'user_uuid' => $author->uuid,
            'type' => 'admin.manual',
            'title' => 'Comunicado administrativo',
            'message' => 'Mensagem de teste enviada pelo painel.',
        ]);

        $createNotification->assertCreated()->assertJsonPath('data.type', 'admin.manual');

        $notificationId = (string) $createNotification->json('data.uuid');

        $this->withToken($token)->postJson('/api/v1/admin/notifications/'.$notificationId, [
            'title' => 'Comunicado atualizado',
            'message' => 'Mensagem atualizada.',
            'is_read' => true,
        ])->assertOk()->assertJsonPath('data.is_read', true);

        $this->withToken($token)->deleteJson('/api/v1/admin/comments/'.$commentId)
            ->assertNoContent();

        $this->withToken($token)->deleteJson('/api/v1/admin/opportunities/'.$opportunityId)
            ->assertNoContent();

        $this->withToken($token)->deleteJson('/api/v1/admin/notifications/'.$notificationId)
            ->assertNoContent();
    }

    public function test_permissions_block_new_modules_for_limited_role(): void
    {
        $this->seed(AdminPermissionSeeder::class);
        $this->seed(AdminRoleSeeder::class);

        $platformUsersList = Permission::query()->where('key', 'platform-users.list')->firstOrFail();

        $limitedRole = Role::query()->create([
            'name' => 'Listador de usuários da plataforma',
            'description' => 'Pode apenas listar usuários da plataforma.',
            'is_system' => false,
        ]);
        $limitedRole->permissions()->sync([$platformUsersList->id]);

        $limitedAdmin = User::factory()->create([
            'email' => 'limited.modules.admin@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);
        $limitedAdmin->roles()->sync([$limitedRole->id]);

        $token = $this->loginAndGetToken($limitedAdmin->email, 'password123');

        $this->withToken($token)->getJson('/api/v1/admin/platform-users')
            ->assertOk();

        $this->withToken($token)->postJson('/api/v1/admin/communities', [
            'owner_uuid' => $limitedAdmin->uuid,
            'name' => 'Sem permissão',
            'slug' => 'sem-permissao',
        ])->assertStatus(403);
    }

    private function createSuperAdminUser(string $email = 'admin.modules@example.com'): User
    {
        $this->seed(AdminPermissionSeeder::class);
        $this->seed(AdminRoleSeeder::class);

        $role = Role::query()->where('name', 'Super Administrador')->firstOrFail();

        $user = User::factory()->create([
            'email' => $email,
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $user->roles()->sync([$role->id]);

        return $user;
    }

    private function loginAndGetToken(string $email, string $password): string
    {
        $response = $this->postJson('/api/v1/admin/auth/login', [
            'email' => $email,
            'password' => $password,
            'token_name' => 'PHPUnit',
        ]);

        $response->assertOk();

        return (string) $response->json('access_token');
    }
}
