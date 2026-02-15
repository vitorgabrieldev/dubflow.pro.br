<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\Playlist;
use App\Models\User;
use App\Support\MediaAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());

        if (mb_strlen($term) < 2) {
            return response()->json([
                'organizations' => [],
                'users' => [],
                'playlists' => [],
                'posts' => [],
            ]);
        }

        $user = auth('api')->user();

        $organizations = Organization::query()
            ->where(function ($builder) use ($term) {
                $builder->where('name', 'like', '%'.$term.'%')
                    ->orWhere('slug', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            })
            ->where(function ($builder) use ($user) {
                if (! $user) {
                    $builder->where('is_public', true);

                    return;
                }

                $builder->where('is_public', true)
                    ->orWhereHas('members', fn ($memberBuilder) => $memberBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            })
            ->latest()
            ->limit(10)
            ->get(['id', 'name', 'slug', 'avatar_path', 'is_verified']);

        $users = User::query()
            ->where(function ($builder) use ($term) {
                $builder->where('name', 'like', '%'.$term.'%')
                    ->orWhere('username', 'like', '%'.$term.'%')
                    ->orWhere('stage_name', 'like', '%'.$term.'%');
            })
            ->latest()
            ->limit(10)
            ->get(['id', 'name', 'username', 'stage_name', 'avatar_path']);

        $playlists = Playlist::query()
            ->where(function ($builder) use ($term) {
                $builder->where('title', 'like', '%'.$term.'%')
                    ->orWhere('work_title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            })
            ->whereHas('organization', function ($builder) use ($user) {
                if (! $user) {
                    $builder->where('is_public', true);

                    return;
                }

                $builder->where('is_public', true)
                    ->orWhereHas('members', fn ($memberBuilder) => $memberBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            })
            ->where(function ($builder) use ($user) {
                if (! $user) {
                    $builder->where('visibility', 'public');

                    return;
                }

                $builder->where('visibility', 'public')
                    ->orWhereHas('organization.members', fn ($memberBuilder) => $memberBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            })
            ->with('organization:id,name,slug')
            ->latest()
            ->limit(10)
            ->get(['id', 'organization_id', 'title', 'slug', 'work_title']);

        $posts = DubbingPost::query()
            ->where(function ($builder) use ($term) {
                $builder->where('title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            })
            ->where(function ($builder) use ($user) {
                if (! $user) {
                    $builder->where('visibility', 'public')->whereNotNull('published_at');

                    return;
                }

                $builder->where(function ($inner) {
                    $inner->where('visibility', 'public')->whereNotNull('published_at');
                })
                    ->orWhere('author_user_id', $user->id)
                    ->orWhereHas('organization.members', fn ($memberBuilder) => $memberBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'active'))
                    ->orWhereHas('collaborators', fn ($collabBuilder) => $collabBuilder
                        ->where('user_id', $user->id)
                        ->where('status', 'accepted'));
            })
            ->with(['organization:id,name,slug', 'author:id,name,username'])
            ->withCount(['likes', 'comments', 'views'])
            ->latest()
            ->limit(10)
            ->get(['id', 'organization_id', 'author_user_id', 'title', 'media_type', 'thumbnail_path', 'published_at']);
        MediaAccess::signPostCollection($posts);

        return response()->json([
            'organizations' => $organizations,
            'users' => $users,
            'playlists' => $playlists,
            'posts' => $posts,
        ]);
    }
}
