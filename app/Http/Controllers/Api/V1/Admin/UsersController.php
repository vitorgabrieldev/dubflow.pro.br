<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UsersController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'name',
        'email',
        'is_active',
        'created_at',
        'updated_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'uuid',
        'name',
        'email',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return UserResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png', 'max:4000'],
            'name' => ['required', 'string', 'max:120'],
            'password_random' => ['required', 'boolean'],
            'password' => ['required_if:password_random,0', 'nullable', 'string', 'min:6'],
            'password_confirmation' => ['required_if:password_random,0', 'nullable', 'string', 'same:password'],
            'email' => ['required', 'string', 'email', 'max:120', Rule::unique('users', 'email')],
            'is_active' => ['sometimes', 'boolean'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'uuid'],
        ]);

        $roleIds = $this->resolveRoleIds($validated['roles'], $this->canAssignSystemRoles());

        $password = (bool) $validated['password_random']
            ? str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT)
            : (string) ($validated['password'] ?? '');

        $user = DB::transaction(function () use ($request, $validated, $password, $roleIds): User {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($password),
                'is_active' => (bool) ($validated['is_active'] ?? true),
            ]);

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')?->store('admin/avatars', 'public');
                if ($path) {
                    $user->avatar_path = $path;
                    $user->save();
                }
            }

            $user->roles()->sync($roleIds);

            return $user;
        });

        $user->load('roles.permissions');

        $this->logAction('users.create', $user->name, 'Criou um novo usuário administrador', $user, [
            'generated_password' => (bool) $validated['password_random'],
        ]);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function show(string $userUuid): UserResource
    {
        $user = $this->findAdminUserByUuid($userUuid);
        $user->load('roles.permissions');

        return new UserResource($user);
    }

    public function update(Request $request, string $userUuid): UserResource
    {
        $user = $this->findAdminUserByUuid($userUuid);
        $current = $this->currentUser();

        if ($current && (int) $current->id === (int) $user->id) {
            throw ValidationException::withMessages([
                'user' => ['Não é permitido editar o próprio usuário por esta rota.'],
            ]);
        }

        $validated = $request->validate([
            'is_active' => ['sometimes', 'required', 'boolean'],
            'roles' => ['sometimes', 'required', 'array', 'min:1'],
            'roles.*' => ['required', 'uuid'],
        ]);

        $before = $user->replicate();

        $shouldInvalidateTokens = false;

        DB::transaction(function () use ($request, $validated, $user, &$shouldInvalidateTokens): void {
            if (array_key_exists('is_active', $validated)) {
                $newIsActive = (bool) $validated['is_active'];

                if ((bool) $user->is_active !== $newIsActive) {
                    $shouldInvalidateTokens = true;
                    $user->is_active = $newIsActive;
                    $user->save();
                }
            }

            if ($request->has('roles')) {
                $roleIds = $this->resolveRoleIds($validated['roles'] ?? [], $this->canAssignSystemRoles());
                $syncResult = $user->roles()->sync($roleIds);
                $rolesChanged = (bool) ($syncResult['attached'] || $syncResult['detached'] || $syncResult['updated']);

                if ($rolesChanged) {
                    $shouldInvalidateTokens = true;
                }

                if (! $user->wasChanged() && $rolesChanged) {
                    $user->touch();
                }
            }

            if ($shouldInvalidateTokens) {
                $user->token_version = ((int) $user->token_version) + 1;
                $user->save();
            }
        });

        $changed = $user->wasChanged();
        $user->refresh()->load('roles.permissions');

        if ($changed) {
            $this->logAction('users.edit', $before->name, 'Editou um usuário administrador', $user, $before);
        }

        return new UserResource($user);
    }

    public function destroy(string $userUuid): JsonResponse
    {
        $user = $this->findAdminUserByUuid($userUuid);
        $current = $this->currentUser();

        if ($current && (int) $current->id === (int) $user->id) {
            throw ValidationException::withMessages([
                'user' => ['Não é permitido remover o próprio usuário.'],
            ]);
        }

        DB::transaction(function () use ($user): void {
            $user->roles()->detach();
            $user->is_active = false;
            $user->token_version = ((int) $user->token_version) + 1;
            $user->save();
        });

        $this->logAction('users.delete', $user->name, 'Removeu permissões de usuário administrador', $user);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer'],
        ]);

        $query = User::query()
            ->select(['id', 'uuid', 'name', 'email', 'avatar_path', 'is_active', 'created_at', 'updated_at'])
            ->with('roles')
            ->whereHas('roles');

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
        }

        $this->applySearch($query, $request->string('search')->toString(), ['uuid', 'name', 'email']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'name', 'email', 'is_active', 'created_at', 'updated_at',
        ], 'name', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        $items = $query->limit(50)->get();

        return UserResource::collection($items);
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'UUID', 'value' => 'uuid'],
            ['name' => 'Nome', 'value' => 'name'],
            ['name' => 'E-mail', 'value' => 'email'],
            ['name' => 'Ativo', 'value' => static fn ($item) => $item->is_active ? 'Sim' : 'Não'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
        ], $items, 'users', 'Exportou usuários administradores');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = User::query()
            ->with('roles.permissions')
            ->whereHas('roles');

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
        }

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    /**
     * @param  array<int, string>  $roleUuids
     * @return array<int, int>
     */
    private function resolveRoleIds(array $roleUuids, bool $allowSystemRoles = true): array
    {
        $requestedUuids = collect($roleUuids)->filter()->unique()->values();

        $roles = Role::query()
            ->select(['id', 'is_system'])
            ->whereIn('uuid', $requestedUuids)
            ->orderBy('id')
            ->get();

        if ($roles->isEmpty() || $roles->count() !== $requestedUuids->count()) {
            throw ValidationException::withMessages([
                'roles' => ['Selecione papéis válidos.'],
            ]);
        }

        if (! $allowSystemRoles && $roles->contains(static fn (Role $role): bool => (bool) $role->is_system)) {
            throw ValidationException::withMessages([
                'roles' => ['Você não pode atribuir papéis de sistema.'],
            ]);
        }

        return $roles->pluck('id')->all();
    }

    private function canAssignSystemRoles(): bool
    {
        $current = $this->currentUser();

        if (! $current) {
            return false;
        }

        $current->loadMissing('roles');

        return $current->roles->contains(static fn (Role $role): bool => (bool) $role->is_system);
    }

    private function findAdminUserByUuid(string $uuid): User
    {
        return User::query()
            ->where('uuid', $uuid)
            ->whereHas('roles')
            ->firstOrFail();
    }
}
