<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserProfileController extends Controller
{
    public function show(Request $request, User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($user->is_private && $viewer?->id !== $user->id) {
            abort(403, 'Perfil privado.');
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

        $posts = $postsQuery->paginate((int) $request->integer('per_page', 20));

        $summaryQuery = DubbingPost::query()->where('author_user_id', $user->id);
        if (! $viewer || $viewer->id !== $user->id) {
            $summaryQuery->where('visibility', 'public')->whereNotNull('published_at');
        }

        $summaryPosts = (clone $summaryQuery)->count();
        $summaryPostIdsQuery = (clone $summaryQuery)->select('id');
        $summaryLikes = DB::table('post_likes')->whereIn('post_id', clone $summaryPostIdsQuery)->count();
        $summaryViews = DB::table('post_views')->whereIn('post_id', clone $summaryPostIdsQuery)->count();

        $organizationsCount = $user->organizationMemberships()->where('status', 'active')->count();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'stage_name' => $user->stage_name,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_path' => $user->avatar_path,
                'cover_path' => $user->cover_path,
                'website_url' => $user->website_url,
                'locale' => $user->locale,
                'created_at' => $user->created_at,
            ],
            'summary' => [
                'posts' => $summaryPosts,
                'likes' => $summaryLikes,
                'views' => $summaryViews,
                'organizations' => $organizationsCount,
            ],
            'posts' => $posts,
        ]);
    }
}
