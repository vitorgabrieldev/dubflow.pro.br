<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Playlist;
use App\Models\PlaylistSeason;
use App\Support\MediaAccess;
use App\Support\OrganizationAccess;
use App\Support\PostViewerPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PlaylistController extends Controller
{
    public function globalIndex(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Playlist::query()
            ->select([
                'id',
                'organization_id',
                'title',
                'slug',
                'description',
                'work_title',
                'release_year',
                'cover_path',
                'visibility',
                'created_at',
            ])
            ->with([
                'organization:id,name,slug,avatar_path,is_verified,owner_user_id',
                'organization.owner:id,name,username,avatar_path',
            ])
            ->withCount(['posts', 'seasons']);

        $query->whereHas('organization', function ($builder) use ($user) {
            if (! $user) {
                $builder->where('is_public', true);

                return;
            }

            $builder->where('is_public', true)
                ->orWhereHas('members', fn ($memberBuilder) => $memberBuilder
                    ->where('user_id', $user->id)
                    ->where('status', 'active'));
        });

        $query->where('visibility', 'public');

        if ($term = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($term) {
                $builder->where('title', 'like', '%'.$term.'%')
                    ->orWhere('work_title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            });
        }

        if ($organizationSlug = $request->string('organization')->toString()) {
            $query->whereHas('organization', fn ($builder) => $builder->where('slug', $organizationSlug));
        }

        if ($userTerm = $request->string('user')->toString()) {
            $query->whereHas('organization', function ($builder) use ($userTerm) {
                $builder
                    ->whereHas('owner', fn ($ownerBuilder) => $ownerBuilder
                        ->where('name', 'like', '%'.$userTerm.'%')
                        ->orWhere('username', 'like', '%'.$userTerm.'%')
                        ->orWhere('stage_name', 'like', '%'.$userTerm.'%'))
                    ->orWhereHas('members.user', fn ($memberBuilder) => $memberBuilder
                        ->where('name', 'like', '%'.$userTerm.'%')
                        ->orWhere('username', 'like', '%'.$userTerm.'%')
                        ->orWhere('stage_name', 'like', '%'.$userTerm.'%'));
            });
        }

        $sort = $request->string('sort')->toString();
        if ($sort === 'popular') {
            $query->orderByDesc('posts_count')->orderByDesc('created_at');
        } elseif ($sort === 'title') {
            $query->orderBy('title');
        } else {
            $query->orderByDesc('created_at');
        }

        $cacheKey = sprintf(
            'playlists:global-index:%s:%s',
            $user?->id ?? 'guest',
            md5($request->fullUrl())
        );

        $payload = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($query, $request) {
            return $query->paginate((int) $request->integer('per_page', 20))->toArray();
        });

        return response()->json($payload);
    }

    public function index(Request $request, Organization $organization): JsonResponse
    {
        $query = Playlist::query()
            ->select([
                'id',
                'organization_id',
                'title',
                'slug',
                'description',
                'work_title',
                'release_year',
                'cover_path',
                'visibility',
                'created_at',
            ])
            ->where('organization_id', $organization->id)
            ->with('organization:id,name,slug,avatar_path,is_verified')
            ->withCount(['posts', 'seasons'])
            ->latest();

        $user = auth('api')->user();
        if (! $organization->is_public && (! $user || ! OrganizationAccess::isActiveMember($user, $organization))) {
            abort(403, 'Organizacao privada.');
        }

        $query->where('visibility', 'public');

        $cacheKey = sprintf(
            'playlists:index:%s:%s:%s',
            $organization->id,
            $user?->id ?? 'guest',
            md5($request->fullUrl())
        );

        $payload = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($query, $request) {
            return $query->paginate((int) $request->integer('per_page', 20))->toArray();
        });

        return response()->json($payload);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManagePlaylists($user, $organization)) {
            abort(403, 'Sem permissao para criar playlist.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'work_title' => ['nullable', 'string', 'max:255'],
            'release_year' => ['required', 'integer', 'min:1900', 'max:2100'],
        ]);

        $slugBase = $validated['slug'] ?? Str::slug($validated['title']);
        $slug = $this->resolveUniquePlaylistSlug($organization->id, $slugBase);

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'work_title' => $validated['work_title'] ?? null,
            'release_year' => $validated['release_year'],
            'visibility' => 'public',
        ]);

        $organization->recalculateVerification();

        return response()->json([
            'playlist' => $playlist->loadCount('posts'),
        ], 201);
    }

    public function show(Request $request, Organization $organization, Playlist $playlist): JsonResponse
    {
        if ($playlist->organization_id !== $organization->id) {
            abort(404);
        }

        $user = auth('api')->user();
        if (! $organization->is_public && (! $user || ! OrganizationAccess::isActiveMember($user, $organization))) {
            abort(403, 'Organizacao privada.');
        }

        $playlist->loadCount(['posts', 'seasons']);
        $seasons = $playlist->seasons()
            ->withCount(['posts as episodes_count'])
            ->orderBy('season_number')
            ->get();

        $postsQuery = $playlist->posts()->with([
            'organization:id,name,slug,avatar_path,is_verified',
            'author:id,name,stage_name,username,avatar_path',
            'collaborators' => fn ($builder) => $builder->where('status', 'accepted')
                ->with('user:id,name,stage_name,username,avatar_path'),
            'credits' => fn ($builder) => $builder->with('dubber:id,name,stage_name,username,avatar_path')->orderBy('display_order'),
            'comments' => fn ($builder) => $builder->with('user:id,name,stage_name,username,avatar_path')
                ->whereNull('parent_id')
                ->with([
                    'replies' => fn ($replyBuilder) => $replyBuilder
                        ->with('user:id,name,stage_name,username,avatar_path')
                        ->latest()
                        ->limit(8),
                ])
                ->latest()
                ->limit(3),
            'playlist:id,title,slug',
            'season:id,playlist_id,season_number,title',
        ])->withCount(['likes', 'comments', 'views'])->latest();

        $postsQuery->where('visibility', 'public');

        $seasonId = $request->integer('season_id');
        if ($seasonId) {
            $postsQuery->where('season_id', $seasonId);
        }

        $posts = $postsQuery->paginate(20);
        PostViewerPermissions::attachToCollection($posts->getCollection(), $user);
        MediaAccess::signPostCollection($posts->getCollection());

        return response()->json([
            'playlist' => $playlist,
            'seasons' => $seasons,
            'posts' => $posts,
        ]);
    }

    public function update(Request $request, Organization $organization, Playlist $playlist): JsonResponse
    {
        if ($playlist->organization_id !== $organization->id) {
            abort(404);
        }

        $user = auth('api')->user();

        if (! OrganizationAccess::canManagePlaylists($user, $organization)) {
            abort(403, 'Sem permissao para editar playlist.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'work_title' => ['nullable', 'string', 'max:255'],
            'release_year' => ['sometimes', 'integer', 'min:1900', 'max:2100'],
        ]);

        $playlist->fill($validated);
        $playlist->visibility = 'public';
        $playlist->save();

        return response()->json([
            'playlist' => $playlist->fresh()->loadCount('posts'),
        ]);
    }

    public function destroy(Organization $organization, Playlist $playlist): JsonResponse
    {
        if ($playlist->organization_id !== $organization->id) {
            abort(404);
        }

        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para remover playlist.');
        }

        if ($playlist->posts()->exists()) {
            abort(422, 'Remova todos os episódios desta playlist antes de excluí-la.');
        }

        $playlist->delete();
        $organization->recalculateVerification();

        return response()->json(['message' => 'Playlist removida com sucesso.']);
    }

    private function resolveUniquePlaylistSlug(int $organizationId, string $slugBase): string
    {
        $slugBase = Str::lower(trim($slugBase));
        $slugBase = $slugBase !== '' ? $slugBase : 'playlist';
        $slug = Str::slug($slugBase);

        if ($slug === '') {
            $slug = 'playlist';
        }

        $candidate = $slug;
        $suffix = 1;

        while (Playlist::query()->where('organization_id', $organizationId)->where('slug', $candidate)->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    public function createSeason(Request $request, Organization $organization, Playlist $playlist): JsonResponse
    {
        if ($playlist->organization_id !== $organization->id) {
            abort(404);
        }

        $user = auth('api')->user();

        if (! OrganizationAccess::canManagePlaylists($user, $organization)) {
            abort(403, 'Sem permissao para criar temporada.');
        }

        $validated = $request->validate([
            'season_number' => ['required', 'integer', 'min:1', 'max:999'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $season = PlaylistSeason::query()->firstOrCreate(
            [
                'playlist_id' => $playlist->id,
                'season_number' => $validated['season_number'],
            ],
            [
                'title' => $validated['title'] ?? null,
                'created_by_user_id' => $user->id,
            ]
        );

        if (! $season->wasRecentlyCreated && ! empty($validated['title']) && $season->title !== $validated['title']) {
            $season->title = $validated['title'];
            $season->save();
        }

        return response()->json([
            'season' => $season->fresh()->loadCount(['posts as episodes_count']),
        ], $season->wasRecentlyCreated ? 201 : 200);
    }
}
