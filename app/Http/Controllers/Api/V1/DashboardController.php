<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\PostCollaborator;
use App\Models\PostView;
use App\Support\MediaAccess;
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
            ->withoutProfileSpace()
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
        MediaAccess::signPostCollection($postPerformance);

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

    public function risingDubbers30Days(Request $request): JsonResponse
    {
        $since = now()->subDays(30);
        $limit = max(1, min(20, (int) $request->integer('limit', 5)));

        $postStats = DB::table('dubbing_posts')
            ->selectRaw('author_user_id as user_id')
            ->selectRaw('COUNT(*) as episodes_launched')
            ->selectRaw('COUNT(DISTINCT DATE(published_at)) as posting_days')
            ->whereNotNull('published_at')
            ->where('published_at', '>=', $since)
            ->groupBy('author_user_id');

        $likesStats = DB::table('post_likes')
            ->join('dubbing_posts', 'dubbing_posts.id', '=', 'post_likes.post_id')
            ->selectRaw('dubbing_posts.author_user_id as user_id')
            ->selectRaw('COUNT(*) as episode_likes')
            ->where('post_likes.created_at', '>=', $since)
            ->groupBy('dubbing_posts.author_user_id');

        $commentsStats = DB::table('comments')
            ->join('dubbing_posts', 'dubbing_posts.id', '=', 'comments.post_id')
            ->selectRaw('dubbing_posts.author_user_id as user_id')
            ->selectRaw('COUNT(*) as episode_comments')
            ->whereNull('comments.deleted_at')
            ->where('comments.created_at', '>=', $since)
            ->groupBy('dubbing_posts.author_user_id');

        $submissionsStats = DB::table('dubbing_test_submissions')
            ->selectRaw('user_id')
            ->selectRaw('COUNT(*) as role_submissions')
            ->where('created_at', '>=', $since)
            ->groupBy('user_id');

        $testsCreatedStats = DB::table('dubbing_tests')
            ->selectRaw('created_by_user_id as user_id')
            ->selectRaw('COUNT(*) as tests_created')
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $since)
            ->groupBy('created_by_user_id');

        $rows = DB::table('users')
            ->leftJoinSub($postStats, 'post_stats', fn ($join) => $join->on('users.id', '=', 'post_stats.user_id'))
            ->leftJoinSub($likesStats, 'likes_stats', fn ($join) => $join->on('users.id', '=', 'likes_stats.user_id'))
            ->leftJoinSub($commentsStats, 'comments_stats', fn ($join) => $join->on('users.id', '=', 'comments_stats.user_id'))
            ->leftJoinSub($submissionsStats, 'submission_stats', fn ($join) => $join->on('users.id', '=', 'submission_stats.user_id'))
            ->leftJoinSub($testsCreatedStats, 'tests_stats', fn ($join) => $join->on('users.id', '=', 'tests_stats.user_id'))
            ->where(function ($query) {
                $query->whereNotNull('post_stats.user_id')
                    ->orWhereNotNull('likes_stats.user_id')
                    ->orWhereNotNull('comments_stats.user_id')
                    ->orWhereNotNull('submission_stats.user_id')
                    ->orWhereNotNull('tests_stats.user_id');
            })
            ->select([
                'users.id',
                'users.name',
                'users.stage_name',
                'users.username',
                'users.avatar_path',
            ])
            ->selectRaw('COALESCE(post_stats.episodes_launched, 0) as episodes_launched')
            ->selectRaw('COALESCE(post_stats.posting_days, 0) as posting_days')
            ->selectRaw('COALESCE(likes_stats.episode_likes, 0) as episode_likes')
            ->selectRaw('COALESCE(comments_stats.episode_comments, 0) as episode_comments')
            ->selectRaw('COALESCE(submission_stats.role_submissions, 0) as role_submissions')
            ->selectRaw('COALESCE(tests_stats.tests_created, 0) as tests_created')
            ->get();

        $ranked = $rows->map(function ($row) {
            $episodes = (int) ($row->episodes_launched ?? 0);
            $postingDays = (int) ($row->posting_days ?? 0);
            $likes = (int) ($row->episode_likes ?? 0);
            $comments = (int) ($row->episode_comments ?? 0);
            $submissions = (int) ($row->role_submissions ?? 0);
            $testsCreated = (int) ($row->tests_created ?? 0);

            $consistencyRatio = min(1, $postingDays / 30);
            $score = ($episodes * 18)
                + ($submissions * 12)
                + ($testsCreated * 14)
                + ($consistencyRatio * 20)
                + ($comments * 0.12)
                + ($likes * 0.08);

            return [
                'id' => (int) $row->id,
                'name' => (string) ($row->stage_name ?: $row->name),
                'username' => $row->username,
                'avatar_path' => $row->avatar_path,
                'metrics' => [
                    'episodes_launched' => $episodes,
                    'episode_comments' => $comments,
                    'episode_likes' => $likes,
                    'posting_days' => $postingDays,
                    'posting_consistency' => round($consistencyRatio, 4),
                    'role_submissions' => $submissions,
                    'tests_created' => $testsCreated,
                ],
                'score' => round($score, 2),
            ];
        })->sortByDesc('score')
            ->sortByDesc('metrics.episodes_launched')
            ->sortByDesc('metrics.role_submissions')
            ->take($limit)
            ->values();

        return response()->json([
            'window_days' => 30,
            'window_label' => 'Últimos 30 dias',
            'data' => $ranked,
        ]);
    }
}
