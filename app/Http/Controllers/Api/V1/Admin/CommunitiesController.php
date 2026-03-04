<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\CommunityCollaboratorResource;
use App\Http\Resources\Admin\CommunityEpisodeResource;
use App\Http\Resources\Admin\CommunityFollowerResource;
use App\Http\Resources\Admin\CommunityResource;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationFollow;
use App\Models\OrganizationMember;
use App\Models\Playlist;
use App\Models\PlaylistSeason;
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
        'is_active',
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
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
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
            'owner_uuid' => ['required', 'string'],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:10240'],
            'name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'name')],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('organizations', 'slug')],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'is_public' => ['sometimes', 'boolean'],
            'is_verified' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $owner = $this->findUserByUuidOrId((string) $validated['owner_uuid']);
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
                'is_active' => (bool) ($validated['is_active'] ?? true),
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
            'owner_uuid' => ['sometimes', 'nullable', 'string'],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:10240'],
            'remove_avatar' => ['sometimes', 'boolean'],
            'remove_cover' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('organizations', 'name')->ignore($community->id)],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('organizations', 'slug')->ignore($community->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'is_public' => ['sometimes', 'boolean'],
            'is_verified' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $validated, $community): void {
            if (array_key_exists('owner_uuid', $validated) && ! empty($validated['owner_uuid'])) {
                $owner = $this->findUserByUuidOrId((string) $validated['owner_uuid']);

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
                'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $community->is_active,
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

    public function restore(string $communityId): JsonResponse
    {
        $community = $this->findCommunityById($communityId, true);

        if (! $community->trashed()) {
            return response()->json([
                'message' => 'Comunidade já está ativa.',
            ], 422);
        }

        $before = $community->replicate();

        DB::transaction(function () use ($community): void {
            $community->restore();
            $community->is_active = true;
            $community->save();
        });

        $community->refresh();

        $this->logAction('communities.restore', $community->name, 'Ativou uma comunidade', $community, $before);

        return response()->json([], 204);
    }

    public function followers(Request $request, string $communityId)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'membership_is_active' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $community = $this->findCommunityById($communityId, true);

        $query = OrganizationFollow::query()
            ->where('organization_follows.organization_id', $community->id)
            ->leftJoin('users', 'users.id', '=', 'organization_follows.user_id')
            ->select('organization_follows.*')
            ->with(['user' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at'])]);

        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->orWhere('users.uuid', 'like', '%'.$search.'%')
                    ->orWhere('users.name', 'like', '%'.$search.'%')
                    ->orWhere('users.email', 'like', '%'.$search.'%')
                    ->orWhere('organization_follows.id', 'like', '%'.$search.'%');
            });
        }

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('users.is_active', (int) $isActive === 1 ? 1 : 0);
        }

        $membershipIsActive = $request->input('membership_is_active');
        if ($membershipIsActive !== null && $membershipIsActive !== '') {
            $query->where('organization_follows.is_active', (int) $membershipIsActive === 1 ? 1 : 0);
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end'], 'organization_follows.created_at');

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'created_at', 'name', 'email',
        ], 'created_at', 'desc');

        foreach ($orderBy as $item) {
            $column = match ($item['name']) {
                'name' => 'users.name',
                'email' => 'users.email',
                default => 'organization_follows.'.$item['name'],
            };

            $query->orderBy($column, $item['sort']);
        }

        $items = $query
            ->paginate($this->resolveLimit($request->integer('limit')))
            ->appends($request->except('page'));

        return CommunityFollowerResource::collection($items);
    }

    public function addFollower(Request $request, string $communityId): JsonResponse
    {
        $validated = $request->validate([
            'user_uuid' => ['required', 'string'],
        ]);

        $community = $this->findCommunityById($communityId, true);
        $user = $this->findUserByUuidOrId((string) $validated['user_uuid']);

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Não é possível adicionar um usuário inativo como seguidor.',
            ], 422);
        }

        $follower = OrganizationFollow::query()->firstOrNew([
            'organization_id' => $community->id,
            'user_id' => $user->id,
        ]);
        $follower->is_active = true;
        $follower->save();

        $follower->load([
            'user' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at']),
        ]);

        $this->logAction('communities.followers.add', $community->name, 'Adicionou seguidor na comunidade', [
            'community_id' => $community->id,
            'user_id' => $user->id,
            'user_uuid' => $user->uuid,
            'user_name' => $user->name,
        ]);

        $response = (new CommunityFollowerResource($follower))->response();
        if ($follower->wasRecentlyCreated) {
            $response->setStatusCode(201);
        }

        return $response;
    }

    public function removeFollower(string $communityId, string $userUuid): JsonResponse
    {
        $community = $this->findCommunityById($communityId, true);
        $user = $this->findUserByUuidOrId($userUuid, true);

        $follower = OrganizationFollow::query()
            ->where('organization_id', $community->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $follower) {
            return response()->json([
                'message' => 'Inscrição de seguidor não encontrada para esse usuário.',
            ], 422);
        }

        $before = $follower->replicate();
        $follower->is_active = false;
        $follower->save();

        $this->logAction('communities.followers.remove', $community->name, 'Inativou inscrição de seguidor na comunidade', [
            'community_id' => $community->id,
            'user_id' => $user->id,
            'user_uuid' => $user->uuid,
            'user_name' => $user->name,
        ], $before);

        return response()->json([], 204);
    }

    public function updateFollowerStatus(Request $request, string $communityId, string $userUuid): CommunityFollowerResource
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $community = $this->findCommunityById($communityId, true);
        $user = $this->findUserByUuidOrId($userUuid, true);

        $follower = OrganizationFollow::query()
            ->where('organization_id', $community->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $follower) {
            abort(422, 'Inscrição de seguidor não encontrada para esse usuário.');
        }

        $before = $follower->replicate();
        $isActive = (bool) $validated['is_active'];
        $follower->is_active = $isActive;
        $follower->save();

        if ($follower->wasChanged()) {
            $this->logAction(
                'communities.followers.status',
                $community->name,
                $isActive ? 'Ativou inscrição de seguidor na comunidade' : 'Inativou inscrição de seguidor na comunidade',
                [
                    'community_id' => $community->id,
                    'user_id' => $user->id,
                    'user_uuid' => $user->uuid,
                    'user_name' => $user->name,
                    'is_active' => $isActive,
                ],
                $before
            );
        }

        $follower->load([
            'user' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at']),
        ]);

        return new CommunityFollowerResource($follower);
    }

    public function episodes(Request $request, string $communityId)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,unlisted'],
            'playlist_id' => ['sometimes', 'nullable', 'integer'],
            'season_id' => ['sometimes', 'nullable', 'integer'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $community = $this->findCommunityById($communityId, true);

        $query = DubbingPost::query()
            ->where('dubbing_posts.organization_id', $community->id)
            ->leftJoin('users as authors', 'authors.id', '=', 'dubbing_posts.author_user_id')
            ->select('dubbing_posts.*')
            ->with([
                'author' => fn ($builder) => $builder
                    ->withTrashed()
                    ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at']),
                'playlist:id,title,slug,work_title',
                'season:id,playlist_id,season_number,title',
            ]);

        if ($request->filled('visibility')) {
            $query->where('dubbing_posts.visibility', $request->string('visibility')->toString());
        }

        if ($request->filled('playlist_id')) {
            $playlistId = (int) $request->integer('playlist_id');
            $playlistBelongsToCommunity = Playlist::query()
                ->withTrashed()
                ->where('id', $playlistId)
                ->where('organization_id', $community->id)
                ->exists();

            if (! $playlistBelongsToCommunity) {
                abort(422, 'Playlist informada não pertence à comunidade.');
            }

            $query->where('dubbing_posts.playlist_id', $playlistId);
        }

        if ($request->filled('season_id')) {
            $seasonId = (int) $request->integer('season_id');
            $seasonBelongsToCommunity = PlaylistSeason::query()
                ->where('id', $seasonId)
                ->whereHas('playlist', fn (Builder $builder) => $builder
                    ->withTrashed()
                    ->where('organization_id', $community->id))
                ->exists();

            if (! $seasonBelongsToCommunity) {
                abort(422, 'Temporada informada não pertence à comunidade.');
            }

            $query->where('dubbing_posts.season_id', $seasonId);
        }

        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->orWhere('dubbing_posts.id', 'like', '%'.$search.'%')
                    ->orWhere('dubbing_posts.title', 'like', '%'.$search.'%')
                    ->orWhere('dubbing_posts.description', 'like', '%'.$search.'%')
                    ->orWhere('authors.name', 'like', '%'.$search.'%')
                    ->orWhere('authors.email', 'like', '%'.$search.'%');
            });
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end'], 'dubbing_posts.created_at');

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'title', 'visibility', 'published_at', 'created_at', 'name',
        ], 'id', 'desc');

        foreach ($orderBy as $item) {
            $column = match ($item['name']) {
                'name' => 'authors.name',
                default => 'dubbing_posts.'.$item['name'],
            };

            $query->orderBy($column, $item['sort']);
        }

        $items = $query
            ->paginate($this->resolveLimit($request->integer('limit')))
            ->appends($request->except('page'));

        return CommunityEpisodeResource::collection($items);
    }

    public function episodeFilters(Request $request, string $communityId): JsonResponse
    {
        $request->validate([
            'playlist_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $community = $this->findCommunityById($communityId, true);

        $playlists = Playlist::query()
            ->withTrashed()
            ->where('organization_id', $community->id)
            ->orderBy('title')
            ->get(['id', 'title', 'slug', 'work_title']);

        $playlistId = $request->input('playlist_id');
        $seasonsQuery = PlaylistSeason::query()
            ->whereIn('playlist_id', $playlists->pluck('id')->all())
            ->with(['playlist' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'title', 'slug'])]);

        if ($playlistId !== null && $playlistId !== '') {
            $seasonsQuery->where('playlist_id', (int) $playlistId);
        }

        $seasons = $seasonsQuery
            ->orderBy('playlist_id')
            ->orderBy('season_number')
            ->get(['id', 'playlist_id', 'season_number', 'title']);

        return response()->json([
            'data' => [
                'playlists' => $playlists->map(fn (Playlist $playlist) => [
                    'id' => $playlist->id,
                    'uuid' => (string) $playlist->id,
                    'title' => $playlist->title,
                    'slug' => $playlist->slug,
                    'work_title' => $playlist->work_title,
                ])->values(),
                'seasons' => $seasons->map(fn (PlaylistSeason $season) => [
                    'id' => $season->id,
                    'uuid' => (string) $season->id,
                    'playlist_id' => $season->playlist_id,
                    'season_number' => $season->season_number,
                    'title' => $season->title,
                    'playlist' => $season->playlist ? [
                        'id' => $season->playlist->id,
                        'title' => $season->playlist->title,
                        'slug' => $season->playlist->slug,
                    ] : null,
                ])->values(),
            ],
        ]);
    }

    public function updateEpisodeStatus(Request $request, string $communityId, string $episodeId): CommunityEpisodeResource
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $community = $this->findCommunityById($communityId, true);

        $episode = DubbingPost::query()
            ->where('organization_id', $community->id)
            ->where('id', (int) $episodeId)
            ->firstOrFail();

        $before = $episode->replicate();
        $isActive = (bool) $validated['is_active'];

        $episode->visibility = $isActive ? 'public' : 'private';
        $episode->published_at = $isActive
            ? ($episode->published_at ?? now())
            : null;

        $episode->save();

        if ($episode->wasChanged()) {
            $this->logAction(
                'communities.episodes.status',
                $community->name,
                $isActive ? 'Ativou episódio da comunidade' : 'Inativou episódio da comunidade',
                $episode,
                $before
            );
        }

        $episode->load([
            'author' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at']),
            'playlist:id,title,slug,work_title',
            'season:id,playlist_id,season_number,title',
        ]);

        return new CommunityEpisodeResource($episode);
    }

    public function collaborators(Request $request, string $communityId)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'role' => ['sometimes', 'nullable', Rule::in(['owner', 'admin', 'editor', 'member'])],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'pending', 'rejected', 'banned'])],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $community = $this->findCommunityById($communityId, true);

        $query = OrganizationMember::query()
            ->where('organization_members.organization_id', $community->id)
            ->leftJoin('users', 'users.id', '=', 'organization_members.user_id')
            ->select('organization_members.*')
            ->with(['user' => fn ($builder) => $builder
                ->withTrashed()
                ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at'])]);

        if ($request->filled('role')) {
            $query->where('organization_members.role', $request->string('role')->toString());
        }

        if ($request->filled('status')) {
            $query->where('organization_members.status', $request->string('status')->toString());
        }

        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->orWhere('users.uuid', 'like', '%'.$search.'%')
                    ->orWhere('users.name', 'like', '%'.$search.'%')
                    ->orWhere('users.email', 'like', '%'.$search.'%')
                    ->orWhere('organization_members.role', 'like', '%'.$search.'%')
                    ->orWhere('organization_members.status', 'like', '%'.$search.'%')
                    ->orWhere('organization_members.id', 'like', '%'.$search.'%');
            });
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end'], 'organization_members.created_at');

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'role', 'status', 'created_at', 'name', 'email',
        ], 'created_at', 'desc');

        foreach ($orderBy as $item) {
            $column = match ($item['name']) {
                'name' => 'users.name',
                'email' => 'users.email',
                default => 'organization_members.'.$item['name'],
            };

            $query->orderBy($column, $item['sort']);
        }

        $items = $query
            ->paginate($this->resolveLimit($request->integer('limit')))
            ->appends($request->except('page'));

        return CommunityCollaboratorResource::collection($items);
    }

    public function updateCollaborator(Request $request, string $communityId, string $userUuid): CommunityCollaboratorResource
    {
        $validated = $request->validate([
            'role' => ['sometimes', Rule::in(['admin', 'editor', 'member'])],
            'status' => ['sometimes', Rule::in(['active', 'pending', 'rejected', 'banned'])],
        ]);

        if (! array_key_exists('role', $validated) && ! array_key_exists('status', $validated)) {
            abort(422, 'Informe ao menos um campo para atualizar (cargo ou status).');
        }

        $community = $this->findCommunityById($communityId, true);
        $user = $this->findUserByUuidOrId($userUuid, true);

        $collaborator = OrganizationMember::query()
            ->where('organization_id', $community->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($collaborator->role === 'owner') {
            if (array_key_exists('role', $validated)) {
                abort(422, 'Não é permitido alterar o cargo do dono da comunidade.');
            }

            if (array_key_exists('status', $validated) && $validated['status'] !== 'active') {
                abort(422, 'Não é permitido inativar o dono da comunidade.');
            }
        }

        $before = $collaborator->replicate();
        if (array_key_exists('role', $validated)) {
            $collaborator->role = $validated['role'];
        }

        if (array_key_exists('status', $validated)) {
            $collaborator->status = $validated['status'];
        }

        $collaborator->save();

        if ($collaborator->wasChanged()) {
            $changedRole = array_key_exists('role', $validated) && $before->role !== $collaborator->role;
            $changedStatus = array_key_exists('status', $validated) && $before->status !== $collaborator->status;
            $message = 'Atualizou colaborador da comunidade';

            if ($changedRole && ! $changedStatus) {
                $message = 'Alterou o cargo de colaborador da comunidade';
            } elseif (! $changedRole && $changedStatus) {
                $message = $collaborator->status === 'active'
                    ? 'Ativou colaborador da comunidade'
                    : 'Inativou colaborador da comunidade';
            }

            $this->logAction(
                'communities.collaborators.edit',
                $community->name,
                $message,
                $collaborator,
                $before
            );
        }

        $collaborator->load(['user' => fn ($builder) => $builder
            ->withTrashed()
            ->select(['id', 'uuid', 'name', 'email', 'is_active', 'deleted_at'])]);

        return new CommunityCollaboratorResource($collaborator);
    }

    public function removeCollaborator(string $communityId, string $userUuid): JsonResponse
    {
        $community = $this->findCommunityById($communityId, true);
        $user = $this->findUserByUuidOrId($userUuid, true);

        $collaborator = OrganizationMember::query()
            ->where('organization_id', $community->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($collaborator->role === 'owner') {
            abort(422, 'Não é permitido remover o dono da comunidade.');
        }

        $before = $collaborator->replicate();
        $collaborator->status = 'banned';
        $collaborator->joined_at = null;
        $collaborator->save();

        $this->logAction(
            'communities.collaborators.delete',
            $community->name,
            'Inativou colaborador da comunidade',
            [
                'organization_id' => $community->id,
                'user_id' => $user->id,
                'user_uuid' => $user->uuid,
                'user_name' => $user->name,
                'role' => $before->role,
            ],
            $before
        );

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'is_public' => ['sometimes', 'integer', 'in:0,1'],
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
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

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
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
            'is_active' => ['sometimes', 'integer', 'in:0,1'],
            'owner_uuid' => ['sometimes', 'nullable', 'string'],
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
            ['name' => 'Ativa', 'value' => static fn ($item) => $item->is_active ? 'Sim' : 'Não'],
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

        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', (int) $isActive === 1 ? 1 : 0);
        }

        if ($request->filled('owner_uuid')) {
            $ownerId = $this->resolveUserIdByUuidOrId($request->string('owner_uuid')->toString());
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

    private function findUserByUuidOrId(string $uuidOrId, bool $withDeleted = false): User
    {
        $query = User::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where(function (Builder $builder) use ($uuidOrId): void {
            $builder->where('uuid', $uuidOrId);

            if (ctype_digit($uuidOrId)) {
                $builder->orWhere('id', (int) $uuidOrId);
            }
        })->firstOrFail();
    }

    private function resolveUserIdByUuidOrId(string $uuidOrId): ?int
    {
        return User::query()
            ->where(function (Builder $builder) use ($uuidOrId): void {
                $builder->where('uuid', $uuidOrId);

                if (ctype_digit($uuidOrId)) {
                    $builder->orWhere('id', (int) $uuidOrId);
                }
            })
            ->value('id');
    }
}
