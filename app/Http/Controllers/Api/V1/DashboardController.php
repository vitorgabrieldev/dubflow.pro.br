<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\PostCollaborator;
use App\Models\PostView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $postIds = DubbingPost::query()
            ->where('author_user_id', $user->id)
            ->pluck('id');

        $totalViews = PostView::query()->whereIn('post_id', $postIds)->count();

        $totalLikes = DB::table('post_likes')->whereIn('post_id', $postIds)->count();
        $totalComments = DB::table('comments')->whereIn('post_id', $postIds)->whereNull('deleted_at')->count();

        $pendingCollaborationInvites = PostCollaborator::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();

        $organizations = Organization::query()
            ->whereHas('members', fn ($query) => $query->where('user_id', $user->id)->where('status', 'active'))
            ->withCount(['followers', 'playlists', 'posts'])
            ->orderByDesc('followers_count')
            ->get(['id', 'name', 'slug', 'avatar_path', 'is_verified']);

        $postPerformance = DubbingPost::query()
            ->where('author_user_id', $user->id)
            ->withCount(['likes', 'comments', 'views'])
            ->orderByDesc('views_count')
            ->limit(10)
            ->get(['id', 'title', 'organization_id', 'playlist_id', 'thumbnail_path', 'published_at'])
            ->load('organization:id,name,slug');

        return response()->json([
            'summary' => [
                'total_posts' => $postIds->count(),
                'total_views' => $totalViews,
                'total_likes' => $totalLikes,
                'total_comments' => $totalComments,
                'pending_collaboration_invites' => $pendingCollaborationInvites,
            ],
            'organizations' => $organizations,
            'top_posts' => $postPerformance,
        ]);
    }
}
