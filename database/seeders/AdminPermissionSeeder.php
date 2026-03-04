<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $mapActions = [
            'list' => 'Listar',
            'show' => 'Visualizar',
            'create' => 'Cadastrar',
            'edit' => 'Editar',
            'delete' => 'Deletar',
            'export' => 'Exportar',
        ];

        $modules = [
            'log' => ['Registros de alterações' => ['list', 'show', 'export']],
            'roles' => ['Papéis e permissões' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'system-log' => ['Registros de erros' => ['list', 'show', 'export']],
            'users' => ['Usuários administradores' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'platform-users' => ['Usuários da plataforma' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'communities' => ['Comunidades' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'posts' => ['Publicações' => ['list', 'show']],
            'playlists' => ['Playlists' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'opportunities' => ['Oportunidades' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'comments' => ['Comentários' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
            'notifications' => ['Notificações' => ['list', 'show', 'create', 'edit', 'delete', 'export']],
        ];

        foreach ($modules as $prefix => $groups) {
            foreach ($groups as $groupName => $actions) {
                foreach (array_values($actions) as $order => $action) {
                    $key = $prefix.'.'.$action;

                    Permission::query()->updateOrCreate(
                        ['key' => $key],
                        [
                            'uuid' => Permission::query()->where('key', $key)->value('uuid') ?: (string) Str::uuid(),
                            'name' => $mapActions[$action] ?? ucfirst($action),
                            'group' => $groupName,
                            'order' => $order,
                        ]
                    );
                }
            }
        }

        $allPermissionIds = Permission::query()->pluck('id')->all();

        Role::query()
            ->where('is_system', true)
            ->each(function (Role $role) use ($allPermissionIds): void {
                $role->permissions()->sync($allPermissionIds);
            });
    }
}
