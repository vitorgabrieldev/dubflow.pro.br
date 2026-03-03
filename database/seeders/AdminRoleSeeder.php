<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminRoleSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::query()->updateOrCreate(
            ['name' => 'Super Administrador'],
            [
                'uuid' => Role::query()->where('name', 'Super Administrador')->value('uuid') ?: (string) Str::uuid(),
                'description' => 'Controle total, possui todas as permissões disponíveis.',
                'is_system' => true,
            ]
        );

        $role->permissions()->sync(Permission::query()->pluck('id')->all());
    }
}
