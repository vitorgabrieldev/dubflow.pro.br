<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationFollow;
use App\Models\OrganizationMember;
use App\Notifications\OrganizationFollowed;
use App\Support\MediaAccess;
use App\Support\OrganizationAccess;
use App\Support\PostViewerPermissions;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Organization::query()
            ->select([
                'id',
                'owner_user_id',
                'name',
                'slug',
                'description',
                'avatar_path',
                'cover_path',
                'is_verified',
                'is_public',
                'created_at',
            ])
            ->with('owner:id,name,username,avatar_path')
            ->withCount(['followers', 'posts', 'playlists'])
            ->latest();

        if ($term = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($term) {
                $builder->where('name', 'like', '%'.$term.'%')
                    ->orWhere('slug', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            });
        }

        $visibility = $request->string('visibility')->toString();
        $discoverPrivate = $request->boolean('discover_private');
        if ($user) {
            $query->where(function ($builder) use ($user, $visibility, $discoverPrivate) {
                if ($visibility === 'private') {
                    $builder->where('is_public', false);

                    if (! $discoverPrivate) {
                        $builder->whereHas('members', fn ($memberBuilder) => $memberBuilder
                            ->where('user_id', $user->id)
                            ->where('status', 'active'));
                    }

                    return;
                }

                if ($visibility === 'public') {
                    $builder->where('is_public', true);

                    return;
                }

                if ($discoverPrivate) {
                    return;
                }

                $builder->where('is_public', true)
                    ->orWhereHas('members', fn ($memberBuilder) => $memberBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            });
        } else {
            if (! $discoverPrivate) {
                $query->where('is_public', true);
            }
        }

        if ($user && $request->boolean('only_joined')) {
            $query->whereHas('members', fn ($builder) => $builder
                ->where('user_id', $user->id)
                ->where('status', 'active'));
        }

        $sort = $request->string('sort')->toString();
        if ($sort === 'followers') {
            $query->orderByDesc('followers_count')->orderByDesc('created_at');
        } elseif ($sort === 'playlists') {
            $query->orderByDesc('playlists_count')->orderByDesc('created_at');
        } elseif ($sort === 'name') {
            $query->orderBy('name');
        } else {
            $query->orderByDesc('created_at');
        }

        $perPage = max(1, min(50, (int) $request->integer('per_page', 12)));

        $cacheKey = sprintf(
            'organizations:index:%s:%s',
            $user?->id ?? 'guest',
            md5($request->fullUrl())
        );

        $payload = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($query, $user, $perPage) {
            $organizations = $query->paginate($perPage);
            $this->attachViewerState($organizations->getCollection(), $user?->id);

            return $organizations->toArray();
        });

        return response()->json($payload);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'name')],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('organizations', 'slug')],
            'description' => ['nullable', 'string', 'max:2000'],
            'website_url' => ['nullable', 'url', 'max:255'],
            'is_public' => ['nullable', 'boolean'],
            'avatar_path' => ['nullable', 'string', 'max:255'],
            'cover_path' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'image', 'max:5120'],
            'cover' => ['nullable', 'image', 'max:10240'],
        ]);

        $user = auth('api')->user();

        $slugBase = $validated['slug'] ?? Str::slug($validated['name']);
        $slug = $this->resolveUniqueOrganizationSlug($slugBase);
        $avatarPath = $request->file('avatar')?->store('organization-avatars', 'public')
            ?? ($validated['avatar_path'] ?? null);
        $coverPath = $request->file('cover')?->store('organization-covers', 'public')
            ?? ($validated['cover_path'] ?? null);

        $organization = Organization::create([
            'owner_user_id' => $user->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'avatar_path' => $avatarPath,
            'cover_path' => $coverPath,
            'website_url' => $validated['website_url'] ?? null,
            'is_public' => $validated['is_public'] ?? true,
            'settings' => [
                'languages' => ['pt-BR', 'en', 'es', 'ja', 'fr'],
            ],
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'status' => 'active',
            'source' => 'owner_created',
            'requested_by_user_id' => $user->id,
            'approved_by_user_id' => $user->id,
            'joined_at' => now(),
            'approved_at' => now(),
        ]);

        Log::channel('audit')->info('organization_created', [
            'organization_id' => $organization->id,
            'created_by_user_id' => $user->id,
            'is_public' => (bool) $organization->is_public,
        ]);

        return response()->json([
            'organization' => $organization->loadCount(['followers', 'posts', 'playlists']),
        ], 201);
    }

    public function show(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $isMember = $user ? OrganizationAccess::isActiveMember($user, $organization) : false;

        $organization->load([
            'owner:id,name,username,avatar_path',
            'playlists' => fn ($query) => $query
                ->where('visibility', 'public')
                ->withCount(['posts', 'seasons'])
                ->latest(),
            'posts' => fn ($query) => $query
                ->when(! $isMember, fn ($builder) => $builder->where('visibility', 'public')->whereNotNull('published_at'))
                ->with([
                    'organization:id,name,slug,avatar_path,is_verified',
                    'author:id,name,stage_name,username,avatar_path',
                    'playlist:id,title',
                    'season:id,playlist_id,season_number,title',
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
                ])
                ->withCount(['likes', 'comments', 'views'])
                ->latest(),
        ])->loadCount(['followers', 'posts', 'playlists']);

        PostViewerPermissions::attachToCollection($organization->posts, $user);
        MediaAccess::signPostCollection($organization->posts);

        $viewer = [
            'is_following' => false,
            'membership_status' => null,
            'role' => null,
            'can_request_join' => false,
            'can_view' => true,
        ];

        if ($user) {
            $viewer['is_following'] = OrganizationFollow::query()
                ->where('organization_id', $organization->id)
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->exists();

            $activeRole = OrganizationMember::query()
                ->where('organization_id', $organization->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->value('role');

            if ($activeRole) {
                $viewer['membership_status'] = 'active';
                $viewer['role'] = $activeRole;
            } else {
                $hasPending = OrganizationMember::query()
                    ->where('organization_id', $organization->id)
                    ->where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->exists();

                if ($hasPending) {
                    $viewer['membership_status'] = 'pending';
                }
            }

            $isBanned = OrganizationMember::query()
                ->where('organization_id', $organization->id)
                ->where('user_id', $user->id)
                ->where('status', 'banned')
                ->exists();

            $viewer['can_request_join'] = (bool) $organization->is_public && ! $viewer['membership_status'] && ! $isBanned;
        }

        return response()->json([
            'organization' => $organization,
            'viewer' => $viewer,
        ]);
    }

    public function myOrganizations(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $perPage = max(1, min(50, (int) $request->integer('per_page', 18)));

        $organizations = Organization::query()
            ->select([
                'id',
                'owner_user_id',
                'name',
                'slug',
                'description',
                'avatar_path',
                'cover_path',
                'is_verified',
                'is_public',
                'created_at',
            ])
            ->with('owner:id,name,username,avatar_path')
            ->withCount(['followers', 'posts', 'playlists'])
            ->whereHas('members', fn ($builder) => $builder
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $this->attachViewerState($organizations->getCollection(), $user->id);

        return response()->json($organizations);
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para editar organizacao.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('organizations', 'name')->ignore($organization->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'website_url' => ['nullable', 'url', 'max:255'],
            'avatar_path' => ['nullable', 'string', 'max:255'],
            'cover_path' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'image', 'max:5120'],
            'cover' => ['nullable', 'image', 'max:10240'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('avatar')) {
            $validated['avatar_path'] = $request->file('avatar')?->store('organization-avatars', 'public');
        }

        if ($request->hasFile('cover')) {
            $validated['cover_path'] = $request->file('cover')?->store('organization-covers', 'public');
        }

        $organization->fill($validated)->save();
        $organization->recalculateVerification();

        return response()->json([
            'organization' => $organization->fresh()->loadCount(['followers', 'posts', 'playlists']),
        ]);
    }

    public function follow(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $follow = OrganizationFollow::query()->firstOrNew([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ]);
        $follow->is_active = true;
        $follow->save();

        if ($organization->owner_user_id !== $user->id && $organization->owner) {
            $organization->owner->notify(new OrganizationFollowed($organization, $user));
        }

        $organization->recalculateVerification();

        Log::channel('audit')->info('organization_followed', [
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ]);

        return response()->json(['message' => 'Agora voce acompanha essa organizacao.']);
    }

    public function unfollow(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        OrganizationFollow::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->update(['is_active' => false]);

        $organization->recalculateVerification();

        Log::channel('audit')->info('organization_unfollowed', [
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ]);

        return response()->json(['message' => 'Voce deixou de acompanhar essa organizacao.']);
    }

    public function requestJoin(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $existing = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing?->status === 'banned') {
            abort(403, 'Você foi banido desta comunidade.');
        }

        if (! $organization->is_public) {
            abort(403, 'Comunidades privadas aceitam entrada apenas por convite.');
        }

        if ($existing?->status === 'active') {
            return response()->json(['message' => 'Voce ja faz parte desta organizacao.']);
        }

        if ($existing) {
            $existing->update([
                'status' => 'active',
                'role' => $existing->role ?: 'member',
                'source' => 'self_join_public',
                'requested_by_user_id' => $user->id,
                'approved_by_user_id' => $user->id,
                'joined_at' => now(),
                'approved_at' => now(),
            ]);
        } else {
            OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'role' => 'member',
                'status' => 'active',
                'source' => 'self_join_public',
                'requested_by_user_id' => $user->id,
                'approved_by_user_id' => $user->id,
                'joined_at' => now(),
                'approved_at' => now(),
            ]);
        }

        Log::channel('audit')->info('organization_joined_public', [
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ]);

        return response()->json(['message' => 'Voce entrou na organizacao com sucesso.']);
    }

    private function attachViewerState(Collection $organizations, ?int $userId): void
    {
        if ($organizations->isEmpty()) {
            return;
        }

        if (! $userId) {
            $organizations->each(function (Organization $organization) {
                $organization->setAttribute('viewer', [
                    'is_following' => false,
                    'membership_status' => null,
                    'role' => null,
                    'can_request_join' => false,
                    'can_view' => true,
                ]);
            });

            return;
        }

        $organizationIds = $organizations->pluck('id');

        $activeRoles = OrganizationMember::query()
            ->whereIn('organization_id', $organizationIds)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->pluck('role', 'organization_id');

        $pendingRequests = OrganizationMember::query()
            ->whereIn('organization_id', $organizationIds)
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->pluck('organization_id')
            ->flip();

        $bannedOrganizations = OrganizationMember::query()
            ->whereIn('organization_id', $organizationIds)
            ->where('user_id', $userId)
            ->where('status', 'banned')
            ->pluck('organization_id')
            ->flip();

        $followed = OrganizationFollow::query()
            ->whereIn('organization_id', $organizationIds)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->pluck('organization_id')
            ->flip();

        $organizations->each(function (Organization $organization) use ($activeRoles, $pendingRequests, $followed, $bannedOrganizations) {
            $role = $activeRoles->get($organization->id);
            $isPending = $pendingRequests->has($organization->id);
            $isBanned = $bannedOrganizations->has($organization->id);

            $organization->setAttribute('viewer', [
                'is_following' => $followed->has($organization->id),
                'membership_status' => $role ? 'active' : ($isPending ? 'pending' : null),
                'role' => $role,
                'can_request_join' => (bool) $organization->is_public && ! $role && ! $isPending && ! $isBanned,
                'can_view' => true,
            ]);
        });
    }

    private function resolveUniqueOrganizationSlug(string $slugBase): string
    {
        $slugBase = Str::lower(trim($slugBase));
        $slugBase = $slugBase !== '' ? $slugBase : 'organizacao';
        $slug = Str::slug($slugBase);

        if ($slug === '') {
            $slug = 'organizacao';
        }

        $candidate = $slug;
        $suffix = 1;

        while (Organization::query()->where('slug', $candidate)->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
