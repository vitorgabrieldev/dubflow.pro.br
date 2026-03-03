<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AdminPermissionSeeder;
use Database\Seeders\AdminRoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminCoreApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_fetch_user_data(): void
    {
        $admin = $this->createSuperAdminUser();

        $login = $this->postJson('/api/v1/admin/auth/login', [
            'email' => $admin->email,
            'password' => 'password123',
            'token_name' => 'PHPUnit',
        ]);

        $login->assertOk()->assertJsonStructure([
            'token_type',
            'access_token',
        ]);

        $token = (string) $login->json('access_token');

        $me = $this->withToken($token)->getJson('/api/v1/admin/auth/user');

        $me->assertOk()
            ->assertJsonPath('data.email', $admin->email)
            ->assertJsonPath('data.name', $admin->name);

        $permissions = $me->json('data.permissions');

        $this->assertIsArray($permissions);
        $this->assertContains('users.list', $permissions);
        $this->assertContains('roles.list', $permissions);
    }

    public function test_admin_can_manage_roles_and_admin_users(): void
    {
        $admin = $this->createSuperAdminUser();
        $token = $this->loginAndGetToken($admin->email, 'password123');

        $permission = Permission::query()->where('key', 'users.list')->firstOrFail();

        $createRole = $this->withToken($token)->postJson('/api/v1/admin/roles', [
            'name' => 'Gestor de Usuários',
            'description' => 'Gerencia usuários do painel',
            'permissions' => [$permission->uuid],
        ]);

        $createRole->assertCreated()->assertJsonPath('data.name', 'Gestor de Usuários');

        $roleUuid = (string) $createRole->json('data.uuid');

        $this->withToken($token)->getJson('/api/v1/admin/roles')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);

        $this->withToken($token)->postJson('/api/v1/admin/roles/'.$roleUuid, [
            'description' => 'Gerencia usuários administrativos',
            'permissions' => [$permission->uuid],
        ])->assertOk()->assertJsonPath('data.description', 'Gerencia usuários administrativos');

        $createUser = $this->withToken($token)->postJson('/api/v1/admin/users', [
            'name' => 'Admin Secundário',
            'email' => 'admin.secundario@example.com',
            'password_random' => true,
            'is_active' => true,
            'roles' => [$roleUuid],
        ]);

        $createUser->assertCreated()->assertJsonPath('data.email', 'admin.secundario@example.com');

        $userUuid = (string) $createUser->json('data.uuid');

        $this->withToken($token)->getJson('/api/v1/admin/users/'.$userUuid)
            ->assertOk()
            ->assertJsonPath('data.uuid', $userUuid)
            ->assertJsonPath('data.roles.0.uuid', $roleUuid);

        $this->withToken($token)->deleteJson('/api/v1/admin/users/'.$userUuid)
            ->assertNoContent();

        $this->withToken($token)->deleteJson('/api/v1/admin/roles/'.$roleUuid)
            ->assertNoContent();
    }

    public function test_user_without_admin_role_cannot_login_admin_panel(): void
    {
        User::factory()->create([
            'email' => 'sem.admin@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/admin/auth/login', [
            'email' => 'sem.admin@example.com',
            'password' => 'password123',
            'token_name' => 'PHPUnit',
        ])->assertStatus(403)
            ->assertJsonPath('message', 'Usuário sem acesso ao painel administrativo.');
    }

    public function test_non_system_admin_cannot_assign_system_role_and_cannot_access_dashboard_without_permission(): void
    {
        $this->seed(AdminPermissionSeeder::class);
        $this->seed(AdminRoleSeeder::class);

        $usersCreatePermission = Permission::query()->where('key', 'users.create')->firstOrFail();
        $superAdminRole = Role::query()->where('name', 'Super Administrador')->firstOrFail();

        $limitedRole = Role::query()->create([
            'name' => 'Criador de Usuários',
            'description' => 'Pode criar usuários administradores.',
            'is_system' => false,
        ]);
        $limitedRole->permissions()->sync([$usersCreatePermission->id]);

        $limitedAdmin = User::factory()->create([
            'email' => 'limited.admin@example.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);
        $limitedAdmin->roles()->sync([$limitedRole->id]);

        $token = $this->loginAndGetToken($limitedAdmin->email, 'password123');

        $this->withToken($token)->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        $this->withToken($token)->postJson('/api/v1/admin/users', [
            'name' => 'Tentativa Escalonada',
            'email' => 'escalated-attempt@example.com',
            'password_random' => true,
            'is_active' => true,
            'roles' => [$superAdminRole->uuid],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['roles']);
    }

    public function test_admin_token_is_invalidated_after_role_change(): void
    {
        $adminA = $this->createSuperAdminUser('admin.a@example.com');
        $adminB = $this->createSuperAdminUser('admin.b@example.com');

        $tokenA = $this->loginAndGetToken($adminA->email, 'password123');
        $tokenB = $this->loginAndGetToken($adminB->email, 'password123');

        $usersListPermission = Permission::query()->where('key', 'users.list')->firstOrFail();
        $limitedRole = Role::query()->create([
            'name' => 'Apenas Listagem',
            'description' => 'Acesso mínimo para listagem de usuários.',
            'is_system' => false,
        ]);
        $limitedRole->permissions()->sync([$usersListPermission->id]);

        $this->withToken($tokenB)->postJson('/api/v1/admin/users/'.$adminA->uuid, [
            'is_active' => true,
            'roles' => [$limitedRole->uuid],
        ])->assertOk();

        auth('api')->logout();

        $this->withToken($tokenA)->getJson('/api/v1/admin/auth/user')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Sessão inválida. Faça login novamente.');
    }

    private function createSuperAdminUser(string $email = 'admin@example.com'): User
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
