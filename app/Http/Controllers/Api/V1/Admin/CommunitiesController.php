<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\CommunityResource;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CommunitiesController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'name',
        'slug',
        'is_public',
        'is_verified',
        'created_at',
        'updated_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'id',
        'name',
        'slug',
        'description',
        'website_url',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_public' => ['sometimes', 'integer', 'in:0,1'],
            'is_verified' => ['sometimes', 'integer', 'in:0,1'],
            'owner_uuid' => ['sometimes', 'nullable', 'uuid'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return CommunityResource::collection($items);
    }

    public function show(string $communityId): CommunityResource
    {
        $community = $this->findCommunityById($communityId, true);
        $community->load('owner')->loadCount(['members', 'followers', 'posts', 'playlists']);

        return new CommunityResource($community);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:10240'],
            'name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'name')],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('organizations', 'slug')],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'is_public' => ['sometimes', 'boolean'],
            'is_verified' => ['sometimes', 'boolean'],
        ]);

        $owner = User::query()->where('uuid', $validated['owner_uuid'])->firstOrFail();
        $slug = $this->resolveUniqueSlug($validated['slug'] ?? $validated['name']);

        $community = DB::transaction(function () use ($request, $validated, $owner, $slug): Organization {
            $community = Organization::query()->create([
                'owner_user_id' => $owner->id,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'website_url' => $validated['website_url'] ?? null,
                'is_public' => (bool) ($validated['is_public'] ?? true),
                'is_verified' => (bool) ($validated['is_verified'] ?? false),
            ]);

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')?->store('organization-avatars', 'public');
                if ($path) {
                    $community->avatar_path = $path;
                }
            }

            if ($request->hasFile('cover')) {
                $path = $request->file('cover')?->store('organization-covers', 'public');
                if ($path) {
                    $community->cover_path = $path;
                }
            }

            $community->save();

            OrganizationMember::query()->updateOrCreate(
                [
                    'organization_id' => $community->id,
                    'user_id' => $owner->id,
                ],
                [
                    'role' => 'owner',
                    'status' => 'active',
                    'joined_at' => now(),
                    'approved_at' => now(),
                    'requested_by_user_id' => $owner->id,
                    'approved_by_user_id' => $owner->id,
                ]
            );

            return $community;
        });

        $community->load('owner')->loadCount(['members', 'followers', 'posts', 'playlists']);

        $this->logAction('communities.create', $community->name, 'Criou uma comunidade', $community);

        return (new CommunityResource($community))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $communityId): CommunityResource
    {
        $community = $this->findCommunityById($communityId, true);
        $before = $community->replicate();

        $validated = $request->validate([
            'owner_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'uuid')],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:10240'],
            'remove_avatar' => ['sometimes', 'boolean'],
            'remove_cover' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('organizations', 'name')->ignore($community->id)],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('organizations', 'slug')->ignore($community->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'is_public' => ['sometimes', 'boolean'],
            'is_verified' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $validated, $community): void {
            if (array_key_exists('owner_uuid', $validated) && ! empty($validated['owner_uuid'])) {
                $owner = User::query()->where('uuid', $validated['owner_uuid'])->firstOrFail();

                $community->owner_user_id = $owner->id;

                OrganizationMember::query()->updateOrCreate(
                    [
                        'organization_id' => $community->id,
                        'user_id' => $owner->id,
                    ],
                    [
                        'role' => 'owner',
                        'status' => 'active',
                        'joined_at' => now(),
                        'approved_at' => now(),
                        'requested_by_user_id' => $owner->id,
                        'approved_by_user_id' => $owner->id,
                    ]
                );
            }

            if (array_key_exists('slug', $validated)) {
                $community->slug = $this->resolveUniqueSlug((string) ($validated['slug'] ?: ($validated['name'] ?? $community->name)), $community->id);
            }

            $community->fill([
                'name' => $validated['name'] ?? $community->name,
                'description' => $validated['description'] ?? $community->description,
                'website_url' => $validated['website_url'] ?? $community->website_url,
                'is_public' => array_key_exists('is_public', $validated) ? (bool) $validated['is_public'] : $community->is_public,
                'is_verified' => array_key_exists('is_verified', $validated) ? (bool) $validated['is_verified'] : $community->is_verified,
            ]);

            if ($request->boolean('remove_avatar') && $community->avatar_path) {
                Storage::disk('public')->delete($community->avatar_path);
                $community->avatar_path = null;
            }

            if ($request->boolean('remove_cover') && $community->cover_path) {
                Storage::disk('public')->delete($community->cover_path);
                $community->cover_path = null;
            }

            if ($request->hasFile('avatar')) {
                if ($community->avatar_path) {
                    Storage::disk('public')->delete($community->avatar_path);
                }

                $path = $request->file('avatar')?->store('organization-avatars', 'public');
                if ($path) {
                    $community->avatar_path = $path;
                }
            }

            if ($request->hasFile('cover')) {
                if ($community->cover_path) {
                    Storage::disk('public')->delete($community->cover_path);
                }

                $path = $request->file('cover')?->store('organization-covers', 'public');
                if ($path) {
                    $community->cover_path = $path;
                }
            }

            $community->save();
        });

        $community->refresh()->load('owner')->loadCount(['members', 'followers', 'posts', 'playlists']);

        if ($community->wasChanged()) {
            $this->logAction('communities.edit', $community->name, 'Editou uma comunidade', $community, $before);
        }

        return new CommunityResource($community);
    }

    public function destroy(string $communityId): JsonResponse
    {
        $community = $this->findCommunityById($communityId, false);
        $before = $community->replicate();

        DB::transaction(function () use ($community): void {
            $community->playlists()->get()->each->delete();
            $community->delete();
        });

        $this->logAction('communities.delete', $community->name, 'Excluiu (soft delete) uma comunidade', $community, $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'is_public' => ['sometimes', 'integer', 'in:0,1'],
            'with_deleted' => ['sometimes', 'boolean'],
        ]);

        $query = Organization::query()->with('owner:id,uuid,name,email');

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        $isPublic = $request->input('is_public');
        if ($isPublic !== null && $isPublic !== '') {
            $query->where('is_public', (int) $isPublic === 1 ? 1 : 0);
        }

        $this->applySearch($query, $request->string('search')->toString(), ['id', 'name', 'slug']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'name', 'slug', 'is_public', 'created_at', 'updated_at',
        ], 'name', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return CommunityResource::collection($query->limit(50)->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_public' => ['sometimes', 'integer', 'in:0,1'],
            'is_verified' => ['sometimes', 'integer', 'in:0,1'],
            'owner_uuid' => ['sometimes', 'nullable', 'uuid'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'ID', 'value' => 'id'],
            ['name' => 'Nome', 'value' => 'name'],
            ['name' => 'Slug', 'value' => 'slug'],
            ['name' => 'Descrição', 'value' => 'description'],
            ['name' => 'Website', 'value' => 'website_url'],
            ['name' => 'Pública', 'value' => static fn ($item) => $item->is_public ? 'Sim' : 'Não'],
            ['name' => 'Verificada', 'value' => static fn ($item) => $item->is_verified ? 'Sim' : 'Não'],
            ['name' => 'Dona', 'value' => static fn ($item) => $item->owner?->name],
            ['name' => 'Seguidores', 'value' => 'followers_count'],
            ['name' => 'Posts', 'value' => 'posts_count'],
            ['name' => 'Playlists', 'value' => 'playlists_count'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
            ['name' => 'Deletada em', 'value' => 'deleted_at', 'format' => 'datetime'],
        ], $items, 'communities', 'Exportou comunidades');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = Organization::query()
            ->with('owner:id,uuid,name,email')
            ->withCount(['members', 'followers', 'posts', 'playlists']);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        $isPublic = $request->input('is_public');
        if ($isPublic !== null && $isPublic !== '') {
            $query->where('is_public', (int) $isPublic === 1 ? 1 : 0);
        }

        $isVerified = $request->input('is_verified');
        if ($isVerified !== null && $isVerified !== '') {
            $query->where('is_verified', (int) $isVerified === 1 ? 1 : 0);
        }

        if ($request->filled('owner_uuid')) {
            $ownerId = User::query()->where('uuid', $request->string('owner_uuid')->toString())->value('id');
            if ($ownerId) {
                $query->where('owner_user_id', $ownerId);
            } else {
                $query->whereRaw('1 = 0');
            }
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

    private function findCommunityById(string $communityId, bool $withDeleted): Organization
    {
        $query = Organization::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where('id', (int) $communityId)->firstOrFail();
    }

    private function resolveUniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base ?: 'comunidade');
        if ($slug === '') {
            $slug = 'comunidade';
        }

        $candidate = $slug;
        $suffix = 1;

        while (Organization::query()
            ->withTrashed()
            ->when($ignoreId, fn (Builder $builder) => $builder->where('id', '!=', $ignoreId))
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
