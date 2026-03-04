<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\PlatformUserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PlatformUsersController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'name',
        'email',
        'username',
        'stage_name',
        'is_active',
        'is_private',
        'state',
        'city',
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
        'username',
        'stage_name',
        'state',
        'city',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
            'is_private' => ['sometimes', 'integer', 'in:0,1'],
            'state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return PlatformUserResource::collection($items);
    }

    public function show(string $userUuid): PlatformUserResource
    {
        $user = $this->findUserByUuid($userUuid, true);
        $user->load('roles:id,uuid,name,is_system');

        return new PlatformUserResource($user);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:120', Rule::unique('users', 'email')],
            'username' => ['sometimes', 'nullable', 'string', 'max:80', Rule::unique('users', 'username')],
            'stage_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'password_random' => ['required', 'boolean'],
            'password' => ['required_if:password_random,0', 'nullable', 'string', 'min:8'],
            'password_confirmation' => ['required_if:password_random,0', 'nullable', 'string', 'same:password'],
            'is_active' => ['sometimes', 'boolean'],
            'is_private' => ['sometimes', 'boolean'],
        ]);

        $password = (bool) $validated['password_random']
            ? str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT)
            : (string) ($validated['password'] ?? '');

        $user = DB::transaction(function () use ($request, $validated, $password): User {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'username' => $validated['username'] ?? null,
                'stage_name' => $validated['stage_name'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'state' => $validated['state'] ?? null,
                'city' => $validated['city'] ?? null,
                'password' => $password,
                'is_active' => (bool) ($validated['is_active'] ?? true),
                'is_private' => (bool) ($validated['is_private'] ?? false),
            ]);

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')?->store('user-avatars', 'public');
                if ($path) {
                    $user->avatar_path = $path;
                    $user->save();
                }
            }

            return $user;
        });

        $this->logAction('platform-users.create', $user->name, 'Criou um usuário da plataforma', $user, [
            'generated_password' => (bool) $validated['password_random'],
        ]);

        return (new PlatformUserResource($user))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $userUuid): PlatformUserResource
    {
        $user = $this->findUserByUuid($userUuid);
        $before = $user->replicate();

        $validated = $request->validate([
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'remove_avatar' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:120', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => ['sometimes', 'nullable', 'string', 'max:80', Rule::unique('users', 'username')->ignore($user->id)],
            'stage_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'is_private' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'password_confirmation' => ['required_with:password', 'same:password'],
        ]);

        $tokensShouldBeInvalidated = false;
        $originalIsActive = (bool) $user->is_active;

        DB::transaction(function () use ($request, $validated, $user, $originalIsActive, &$tokensShouldBeInvalidated): void {
            $user->fill([
                'name' => $validated['name'] ?? $user->name,
                'email' => $validated['email'] ?? $user->email,
                'username' => $validated['username'] ?? $user->username,
                'stage_name' => $validated['stage_name'] ?? $user->stage_name,
                'bio' => $validated['bio'] ?? $user->bio,
                'state' => $validated['state'] ?? $user->state,
                'city' => $validated['city'] ?? $user->city,
                'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $user->is_active,
                'is_private' => array_key_exists('is_private', $validated) ? (bool) $validated['is_private'] : $user->is_private,
            ]);

            if (! empty($validated['password'])) {
                $tokensShouldBeInvalidated = true;
                $user->password = (string) $validated['password'];
            }

            if (array_key_exists('is_active', $validated) && $originalIsActive !== (bool) $validated['is_active']) {
                $tokensShouldBeInvalidated = true;
            }

            if ($request->boolean('remove_avatar') && $user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
                $user->avatar_path = null;
            }

            if ($request->hasFile('avatar')) {
                if ($user->avatar_path) {
                    Storage::disk('public')->delete($user->avatar_path);
                }

                $path = $request->file('avatar')?->store('user-avatars', 'public');
                if ($path) {
                    $user->avatar_path = $path;
                }
            }

            if ($tokensShouldBeInvalidated) {
                $user->token_version = ((int) $user->token_version) + 1;
            }

            $user->save();
        });

        if ($user->wasChanged()) {
            $this->logAction('platform-users.edit', $user->name, 'Editou um usuário da plataforma', $user, $before);
        }

        return new PlatformUserResource($user->fresh());
    }

    public function destroy(string $userUuid): JsonResponse
    {
        $user = $this->findUserByUuid($userUuid);
        $before = $user->replicate();

        DB::transaction(function () use ($user): void {
            $user->is_active = false;
            $user->token_version = ((int) $user->token_version) + 1;
            $user->save();
        });

        $this->logAction('platform-users.delete', $user->name, 'Desativou um usuário da plataforma', $user, $before);

        return response()->json([], 204);
    }

    public function destroyPermanent(Request $request, string $userUuid): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = $this->findUserByUuid($userUuid, true);
        $current = $this->currentUser();

        if ($current && (int) $current->id === (int) $user->id) {
            throw ValidationException::withMessages([
                'user' => ['Não é permitido deletar o próprio usuário.'],
            ]);
        }

        if ($user->trashed()) {
            return response()->json([
                'message' => 'Usuário já está deletado.',
            ], 422);
        }

        if (! Hash::check((string) $validated['password'], (string) $user->password)) {
            return response()->json([
                'message' => 'A senha informada não corresponde à senha atual do usuário.',
                'errors' => [
                    'password' => ['A senha informada não corresponde à senha atual do usuário.'],
                ],
            ], 422);
        }

        $before = $user->replicate();
        $name = (string) $user->name;
        $uuid = (string) $user->uuid;
        $email = (string) $user->email;

        DB::transaction(function () use ($user): void {
            $user->is_active = false;
            $user->token_version = ((int) $user->token_version) + 1;
            $user->save();
            $user->delete();
        });

        $this->logAction('platform-users.soft-delete', $name, 'Deletou (soft delete) um usuário da plataforma', [
            'uuid' => $uuid,
            'name' => $name,
            'email' => $email,
        ], $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
        ]);

        $query = User::query()
            ->withTrashed()
            ->with('roles:id,uuid,name,is_system');

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
        }

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'name', 'email', 'username', 'stage_name', 'created_at', 'updated_at',
        ], 'name', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return PlatformUserResource::collection($query->limit(50)->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
            'is_private' => ['sometimes', 'integer', 'in:0,1'],
            'state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'UUID', 'value' => 'uuid'],
            ['name' => 'Nome', 'value' => 'name'],
            ['name' => 'E-mail', 'value' => 'email'],
            ['name' => 'Username', 'value' => 'username'],
            ['name' => 'Nome artístico', 'value' => 'stage_name'],
            ['name' => 'Ativo', 'value' => static fn ($item) => $item->is_active ? 'Sim' : 'Não'],
            ['name' => 'Deletado', 'value' => static fn ($item) => $item->deleted_at ? 'Sim' : 'Não'],
            ['name' => 'Privado', 'value' => static fn ($item) => $item->is_private ? 'Sim' : 'Não'],
            ['name' => 'Estado', 'value' => 'state'],
            ['name' => 'Cidade', 'value' => 'city'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
            ['name' => 'Deletado em', 'value' => 'deleted_at', 'format' => 'datetime'],
        ], $items, 'platform-users', 'Exportou usuários da plataforma');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = User::query()
            ->withTrashed()
            ->with('roles:id,uuid,name,is_system');

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
        }

        $isPrivate = $request->input('is_private');
        if ($isPrivate !== null && $isPrivate !== '') {
            $query->where('is_private', (int) $isPrivate === 1 ? 1 : 0);
        }

        if ($request->filled('state')) {
            $query->where('state', $request->string('state')->toString());
        }

        if ($request->filled('city')) {
            $query->where('city', $request->string('city')->toString());
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

    private function findUserByUuid(string $uuid, bool $withDeleted = false): User
    {
        $query = User::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where(function (Builder $builder) use ($uuid): void {
            $builder->where('uuid', $uuid);

            if (ctype_digit($uuid)) {
                $builder->orWhere('id', (int) $uuid);
            }
        })->firstOrFail();
    }
}
