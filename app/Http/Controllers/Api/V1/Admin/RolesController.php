<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RolesController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'name',
        'description',
        'is_system',
        'created_at',
        'updated_at',
        'permissions_count',
        'users_count',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'uuid',
        'name',
        'description',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return RoleResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:255'],
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['required', 'uuid'],
        ]);

        $permissionIds = Permission::query()
            ->whereIn('uuid', collect($validated['permissions'])->unique()->values())
            ->orderBy('id')
            ->pluck('id');

        if ($permissionIds->isEmpty()) {
            throw ValidationException::withMessages([
                'permissions' => ['Selecione permissões válidas.'],
            ]);
        }

        $role = DB::transaction(function () use ($validated, $permissionIds): Role {
            $role = Role::query()->create([
                'name' => $validated['name'],
                'description' => $validated['description'],
                'is_system' => false,
            ]);

            $role->permissions()->sync($permissionIds->all());

            return $role;
        });

        $role->load('permissions')->loadCount(['permissions', 'users']);

        $this->logAction('roles.create', $role->name, 'Criou um novo papel', $role);

        return (new RoleResource($role))->response()->setStatusCode(201);
    }

    public function show(string $roleUuid): RoleResource
    {
        $role = $this->findRoleByUuid($roleUuid);
        $role->load('permissions')->loadCount(['permissions', 'users']);

        return new RoleResource($role);
    }

    public function update(Request $request, string $roleUuid): RoleResource
    {
        $role = $this->findRoleByUuid($roleUuid);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Não é permitido editar um papel de sistema.'],
            ]);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['sometimes', 'required', 'string', 'max:255'],
            'permissions' => ['sometimes', 'required', 'array', 'min:1'],
            'permissions.*' => ['required', 'uuid'],
        ]);

        $before = $role->replicate();

        DB::transaction(function () use ($request, $role, $validated): void {
            $role->fill([
                'name' => $validated['name'] ?? $role->name,
                'description' => $validated['description'] ?? $role->description,
            ]);
            $role->save();

            if ($request->has('permissions')) {
                $permissionIds = Permission::query()
                    ->whereIn('uuid', collect($validated['permissions'] ?? [])->unique()->values())
                    ->orderBy('id')
                    ->pluck('id');

                if ($permissionIds->isEmpty()) {
                    throw ValidationException::withMessages([
                        'permissions' => ['Selecione permissões válidas.'],
                    ]);
                }

                $syncResult = $role->permissions()->sync($permissionIds->all());

                if (! $role->wasChanged() && ($syncResult['attached'] || $syncResult['detached'] || $syncResult['updated'])) {
                    $role->touch();
                }
            }
        });

        $changed = $role->wasChanged();
        $role->refresh()->load('permissions')->loadCount(['permissions', 'users']);

        if ($changed) {
            $this->logAction('roles.edit', $before->name, 'Editou um papel', $role, $before);
        }

        return new RoleResource($role);
    }

    public function destroy(string $roleUuid): JsonResponse
    {
        $role = $this->findRoleByUuid($roleUuid);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Não é permitido excluir um papel de sistema.'],
            ]);
        }

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Não é permitido excluir um papel vinculado a usuários.'],
            ]);
        }

        $role->delete();

        $this->logAction('roles.delete', $role->name, 'Excluiu um papel', $role);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
        ]);

        $query = Role::query();
        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'name', 'description', 'is_system', 'created_at', 'updated_at',
        ], 'name', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return RoleResource::collection($query->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'UUID', 'value' => 'uuid'],
            ['name' => 'Nome', 'value' => 'name'],
            ['name' => 'Descrição', 'value' => 'description'],
            ['name' => 'Sistema', 'value' => static fn ($item) => $item->is_system ? 'Sim' : 'Não'],
            ['name' => 'Permissões', 'value' => 'permissions_count'],
            ['name' => 'Usuários', 'value' => 'users_count'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
        ], $items, 'roles', 'Exportou papéis');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = Role::query()
            ->with('permissions')
            ->withCount(['permissions', 'users']);

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    private function findRoleByUuid(string $uuid): Role
    {
        return Role::query()->where('uuid', $uuid)->firstOrFail();
    }
}
