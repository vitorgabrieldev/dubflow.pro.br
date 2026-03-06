<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\Playlist;
use App\Models\User;
use App\Support\MediaAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class UnifiedSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());
        $limit = min(max((int) $request->integer('limit', 12), 1), 24);

        if (mb_strlen($term) < 2) {
            return response()->json($this->emptyPayload());
        }

        /** @var User|null $user */
        $user = auth('api')->user();
        $cacheKey = sprintf(
            'search:unified:%s:%s:%d',
            $user?->id ?? 'guest',
            md5(mb_strtolower($term)),
            $limit
        );

        $payload = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($term, $limit, $user) {
            $organizations = Organization::query()
                ->where(function (Builder $builder) use ($term) {
                    $builder->where('name', 'like', '%'.$term.'%')
                        ->orWhere('slug', 'like', '%'.$term.'%')
                        ->orWhere('description', 'like', '%'.$term.'%');
                })
                ->where(function (Builder $builder) use ($user) {
                    $this->applyOrganizationVisibility($builder, $user);
                })
                ->latest()
                ->limit($limit)
                ->get(['id', 'name', 'slug', 'avatar_path', 'is_verified']);

            $users = User::query()
                ->where(function (Builder $builder) use ($term) {
                    $builder->where('name', 'like', '%'.$term.'%')
                        ->orWhere('username', 'like', '%'.$term.'%')
                        ->orWhere('stage_name', 'like', '%'.$term.'%');
                })
                ->latest()
                ->limit($limit)
                ->get(['id', 'name', 'username', 'stage_name', 'avatar_path']);

            $playlists = Playlist::query()
                ->where(function (Builder $builder) use ($term) {
                    $builder->where('title', 'like', '%'.$term.'%')
                        ->orWhere('work_title', 'like', '%'.$term.'%')
                        ->orWhere('description', 'like', '%'.$term.'%');
                })
                ->whereHas('organization', function (Builder $builder) use ($user) {
                    $this->applyOrganizationVisibility($builder, $user);
                })
                ->where(function (Builder $builder) use ($user) {
                    $this->applyPlaylistVisibility($builder, $user);
                })
                ->with('organization:id,name,slug')
                ->latest()
                ->limit($limit)
                ->get(['id', 'organization_id', 'title', 'slug', 'work_title']);

            $episodes = DubbingPost::query()
                ->where(function (Builder $builder) use ($term) {
                    $builder->where('title', 'like', '%'.$term.'%')
                        ->orWhere('description', 'like', '%'.$term.'%');
                })
                ->where(function (Builder $builder) use ($user) {
                    $this->applyPostVisibility($builder, $user);
                })
                ->with([
                    'organization:id,name,slug',
                    'playlist:id,title,slug,organization_id',
                    'season:id,playlist_id,season_number,title',
                ])
                ->latest()
                ->limit($limit)
                ->get([
                    'id',
                    'organization_id',
                    'playlist_id',
                    'season_id',
                    'author_user_id',
                    'title',
                    'media_type',
                    'media_path',
                    'thumbnail_path',
                    'metadata',
                    'published_at',
                ]);

            MediaAccess::signPostCollection($episodes);

            $episodeResults = $this->buildEpisodeResults($episodes);
            $seasons = $this->buildSeasonResults($episodes, $limit);

            return [
                'organizations' => $organizations->values(),
                'users' => $users->values(),
                'playlists' => $playlists->values(),
                'episodes' => $episodeResults->values(),
                'seasons' => $seasons->values(),
                'counts' => [
                    'organizations' => $organizations->count(),
                    'users' => $users->count(),
                    'playlists' => $playlists->count(),
                    'episodes' => $episodeResults->count(),
                    'seasons' => $seasons->count(),
                ],
            ];
        });

        return response()->json($payload);
    }

    private function emptyPayload(): array
    {
        return [
            'organizations' => [],
            'users' => [],
            'playlists' => [],
            'episodes' => [],
            'seasons' => [],
            'counts' => [
                'organizations' => 0,
                'users' => 0,
                'playlists' => 0,
                'episodes' => 0,
                'seasons' => 0,
            ],
        ];
    }

    private function applyOrganizationVisibility(Builder $builder, ?User $user): void
    {
        $builder->withoutProfileSpace();

        if (! $user) {
            $builder->where('is_public', true);

            return;
        }

        $builder->where('is_public', true)
            ->orWhereHas('members', fn (Builder $memberBuilder) => $memberBuilder
                ->where('user_id', $user->id)
                ->where('status', 'active'));
    }

    private function applyPlaylistVisibility(Builder $builder, ?User $user): void
    {
        if (! $user) {
            $builder->where('visibility', 'public');

            return;
        }

        $builder->where('visibility', 'public')
            ->orWhereHas('organization.members', fn (Builder $memberBuilder) => $memberBuilder
                ->where('user_id', $user->id)
                ->where('status', 'active'));
    }

    private function applyPostVisibility(Builder $builder, ?User $user): void
    {
        if (! $user) {
            $builder->where('visibility', 'public')->whereNotNull('published_at');

            return;
        }

        $builder->where(function (Builder $inner) {
            $inner->where('visibility', 'public')->whereNotNull('published_at');
        })
            ->orWhere('author_user_id', $user->id)
            ->orWhereHas('organization.members', fn (Builder $memberBuilder) => $memberBuilder
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->orWhereHas('collaborators', fn (Builder $collabBuilder) => $collabBuilder
                ->where('user_id', $user->id)
                ->where('status', 'accepted'));
    }

    private function buildEpisodeResults(Collection $episodes): Collection
    {
        return $episodes
            ->filter(fn (DubbingPost $post) => $post->organization !== null)
            ->map(function (DubbingPost $post) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'media_type' => $post->media_type,
                    'thumbnail_path' => $post->thumbnail_path,
                    'preview_image_path' => $this->resolveEpisodePreviewImagePath($post),
                    'preview_video_path' => $this->resolveEpisodePreviewVideoPath($post),
                    'organization' => [
                        'id' => $post->organization->id,
                        'name' => $post->organization->name,
                        'slug' => $post->organization->slug,
                    ],
                ];
            })
            ->values();
    }

    private function buildSeasonResults(Collection $episodes, int $limit): Collection
    {
        return $episodes
            ->filter(fn (DubbingPost $post) => $post->season !== null && $post->playlist !== null && $post->organization !== null)
            ->map(function (DubbingPost $post) {
                return [
                    'id' => $post->season->id,
                    'season_number' => $post->season->season_number,
                    'title' => $post->season->title,
                    'playlist' => [
                        'id' => $post->playlist->id,
                        'title' => $post->playlist->title,
                        'slug' => $post->playlist->slug,
                    ],
                    'organization' => [
                        'id' => $post->organization->id,
                        'name' => $post->organization->name,
                        'slug' => $post->organization->slug,
                    ],
                ];
            })
            ->unique(fn (array $season) => $season['playlist']['id'].':'.$season['id'])
            ->values()
            ->take($limit);
    }

    private function resolveEpisodePreviewImagePath(DubbingPost $post): ?string
    {
        if (is_string($post->thumbnail_path) && trim($post->thumbnail_path) !== '') {
            return $post->thumbnail_path;
        }

        $metadata = is_array($post->metadata) ? $post->metadata : [];
        $assets = $metadata['assets'] ?? null;

        if (is_array($assets)) {
            foreach ($assets as $asset) {
                if (! is_array($asset)) {
                    continue;
                }

                if (($asset['type'] ?? null) !== 'image') {
                    continue;
                }

                $path = $asset['path'] ?? null;
                if (is_string($path) && trim($path) !== '') {
                    return $path;
                }
            }
        }

        if ($post->media_type === 'image' && is_string($post->media_path) && trim($post->media_path) !== '') {
            return $post->media_path;
        }

        return null;
    }

    private function resolveEpisodePreviewVideoPath(DubbingPost $post): ?string
    {
        $metadata = is_array($post->metadata) ? $post->metadata : [];
        $assets = $metadata['assets'] ?? null;

        if (is_array($assets)) {
            foreach ($assets as $asset) {
                if (! is_array($asset)) {
                    continue;
                }

                if (($asset['type'] ?? null) !== 'video') {
                    continue;
                }

                $path = $asset['path'] ?? null;
                if (is_string($path) && trim($path) !== '') {
                    return $path;
                }
            }
        }

        if ($post->media_type === 'video' && is_string($post->media_path) && trim($post->media_path) !== '') {
            return $post->media_path;
        }

        return null;
    }
}
