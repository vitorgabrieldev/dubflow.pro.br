<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserAchievement;
use App\Support\ChatAccess;
use App\Support\MediaAccess;
use App\Support\PostViewerPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserProfileController extends Controller
{
    public function show(Request $request, User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($user->is_private && $viewer?->id !== $user->id) {
            if (! $viewer) {
                abort(403, 'Perfil privado.');
            }

            $isAllowedViewer = $user->followingUsers()
                ->where('users.id', $viewer->id)
                ->exists();

            if (! $isAllowedViewer) {
                abort(403, 'Perfil privado.');
            }
        }

        $postsQuery = DubbingPost::query()
            ->where('author_user_id', $user->id)
            ->with([
                'organization:id,name,slug,avatar_path,is_verified',
                'author:id,name,stage_name,username,avatar_path',
                'playlist:id,title,slug',
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
            ->latest('published_at')
            ->latest('created_at');

        if (! $viewer || $viewer->id !== $user->id) {
            $postsQuery->where('visibility', 'public')->whereNotNull('published_at');
        }

        $postsPerPage = max(1, min(50, (int) $request->integer('per_page', 20)));
        $posts = $postsQuery->paginate($postsPerPage);
        PostViewerPermissions::attachToCollection($posts->getCollection(), $viewer);
        MediaAccess::signPostCollection($posts->getCollection());

        $signedUserAvatarPath = MediaAccess::signPath($user->avatar_path);
        $signedUserCoverPath = MediaAccess::signPath($user->cover_path);

        $summaryQuery = DubbingPost::query()->where('author_user_id', $user->id);
        if (! $viewer || $viewer->id !== $user->id) {
            $summaryQuery->where('visibility', 'public')->whereNotNull('published_at');
        }

        $summaryPosts = (clone $summaryQuery)->count();
        $summaryPostIdsQuery = (clone $summaryQuery)->select('id');
        $summaryLikes = DB::table('post_likes')->whereIn('post_id', clone $summaryPostIdsQuery)->count();
        $summaryViews = DB::table('post_views')->whereIn('post_id', clone $summaryPostIdsQuery)->count();

        $organizationsCount = $user->organizationMemberships()->where('status', 'active')->count();
        $followersCount = $user->followerUsers()->count();
        $followingCount = $user->followingUsers()->count();
        $viewerCanFollow = (bool) $viewer && $viewer->id !== $user->id;
        $viewerIsFollowing = $viewerCanFollow
            ? $viewer->followingUsers()->where('users.id', $user->id)->exists()
            : false;
        $viewerCanMessage = false;
        $viewerMessageReason = null;

        if ($viewer && $viewer->id !== $user->id) {
            $chatAccess = ChatAccess::canSendMessage($viewer, $user);
            $viewerCanMessage = (bool) $chatAccess['allowed'];
            $viewerMessageReason = $chatAccess['reason'];
        }

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
            ->withCount(['followers', 'posts', 'playlists'])
            ->whereHas('members', fn ($builder) => $builder
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->orderByDesc('created_at')
            ->limit(max(1, min(24, (int) $request->integer('organizations_limit', 12))))
            ->get()
            ->map(function (Organization $organization): array {
                return [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'slug' => $organization->slug,
                    'description' => $organization->description,
                    'avatar_path' => MediaAccess::signPath($organization->avatar_path),
                    'cover_path' => MediaAccess::signPath($organization->cover_path),
                    'is_verified' => (bool) $organization->is_verified,
                    'is_public' => (bool) $organization->is_public,
                    'followers_count' => (int) $organization->followers_count,
                    'posts_count' => (int) $organization->posts_count,
                    'playlists_count' => (int) $organization->playlists_count,
                ];
            })
            ->values();

        $activeAt = now();
        $achievements = UserAchievement::query()
            ->where('user_id', $user->id)
            ->where(function ($builder) use ($activeAt): void {
                $builder->whereNull('expires_at')->orWhere('expires_at', '>=', $activeAt);
            })
            ->with([
                'definition:id,slug,title,description,category,rarity,icon,color_start,color_end,is_active',
                'levelDefinition:id,achievement_definition_id,level,title,description,rarity,icon,color_start,color_end',
            ])
            ->orderByDesc('unlocked_at')
            ->limit(max(1, min(60, (int) $request->integer('achievements_limit', 30))))
            ->get()
            ->filter(fn (UserAchievement $achievement): bool => (bool) optional($achievement->definition)->is_active)
            ->map(function (UserAchievement $achievement): array {
                return [
                    'id' => $achievement->id,
                    'achievement_definition_id' => $achievement->achievement_definition_id,
                    'achievement_level_id' => $achievement->achievement_level_id,
                    'level' => (int) $achievement->level,
                    'unlocked_at' => optional($achievement->unlocked_at)?->toIso8601String(),
                    'expires_at' => optional($achievement->expires_at)?->toIso8601String(),
                    'definition' => [
                        'id' => optional($achievement->definition)->id,
                        'slug' => optional($achievement->definition)->slug,
                        'title' => optional($achievement->definition)->title,
                        'description' => optional($achievement->definition)->description,
                        'category' => optional($achievement->definition)->category,
                        'rarity' => optional($achievement->definition)->rarity,
                        'icon' => optional($achievement->definition)->icon,
                        'color_start' => optional($achievement->definition)->color_start,
                        'color_end' => optional($achievement->definition)->color_end,
                    ],
                    'level_definition' => $achievement->levelDefinition ? [
                        'id' => $achievement->levelDefinition->id,
                        'level' => (int) $achievement->levelDefinition->level,
                        'title' => $achievement->levelDefinition->title,
                        'description' => $achievement->levelDefinition->description,
                        'rarity' => $achievement->levelDefinition->rarity,
                        'icon' => $achievement->levelDefinition->icon,
                        'color_start' => $achievement->levelDefinition->color_start,
                        'color_end' => $achievement->levelDefinition->color_end,
                    ] : null,
                ];
            })
            ->values();

        $proposalContactPreferences = collect(is_array($user->proposal_contact_preferences) ? $user->proposal_contact_preferences : [])
            ->filter(fn ($value): bool => is_string($value) && trim($value) !== '')
            ->map(fn ($value): string => trim((string) $value))
            ->values();

        $proposalContactLinks = collect(is_array($user->proposal_contact_links) ? $user->proposal_contact_links : [])
            ->only($proposalContactPreferences->all())
            ->map(fn ($value): ?string => is_string($value) ? trim($value) : null)
            ->filter(fn ($value): bool => is_string($value) && $value !== '')
            ->all();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'stage_name' => $user->stage_name,
                'pronouns' => $user->pronouns,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_path' => $signedUserAvatarPath,
                'cover_path' => $signedUserCoverPath,
                'website_url' => $user->website_url,
                'locale' => $user->locale,
                'skills' => $user->skills,
                'dubbing_languages' => $user->dubbing_languages,
                'voice_accents' => $user->voice_accents,
                'has_recording_equipment' => $user->has_recording_equipment,
                'recording_equipment' => $user->recording_equipment,
                'recording_equipment_other' => $user->recording_equipment_other,
                'weekly_availability' => $user->weekly_availability,
                'state' => $user->state,
                'city' => $user->city,
                'proposal_contact_preferences' => $proposalContactPreferences->all(),
                'proposal_contact_links' => $proposalContactLinks,
                'social_links' => $user->social_links,
                'profile_links' => $user->profile_links,
                'tags' => $user->tags,
                'dubbing_history' => $user->dubbing_history,
                'created_at' => $user->created_at,
            ],
            'summary' => [
                'posts' => $summaryPosts,
                'likes' => $summaryLikes,
                'views' => $summaryViews,
                'organizations' => $organizationsCount,
                'followers' => $followersCount,
                'following' => $followingCount,
            ],
            'viewer' => [
                'can_follow' => $viewerCanFollow,
                'is_following' => $viewerIsFollowing,
                'can_message' => $viewerCanMessage,
                'message_reason' => $viewerMessageReason,
            ],
            'communities' => $organizations,
            'achievements' => $achievements,
            'posts' => $posts,
        ]);
    }

    public function follow(User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($viewer->id === $user->id) {
            abort(422, 'Você não pode seguir a própria conta.');
        }

        $viewer->followingUsers()->syncWithoutDetaching([$user->id]);

        return response()->json([
            'message' => 'Agora você está seguindo este usuário.',
            'followers_count' => $user->followerUsers()->count(),
        ]);
    }

    public function unfollow(User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($viewer->id === $user->id) {
            abort(422, 'Você não pode deixar de seguir a própria conta.');
        }

        $viewer->followingUsers()->detach($user->id);

        return response()->json([
            'message' => 'Você deixou de seguir este usuário.',
            'followers_count' => $user->followerUsers()->count(),
        ]);
    }
}
