<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\Playlist;
use App\Models\PlaylistSeason;
use App\Models\PostCollaborator;
use App\Models\PostCredit;
use App\Models\PostLike;
use App\Models\Tag;
use App\Models\User;
use App\Notifications\OrganizationPublishedPost;
use App\Notifications\PostCollaborationRequested;
use App\Support\MediaAccess;
use App\Support\AchievementEngine;
use App\Support\OrganizationAccess;
use App\Support\PostViewerPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = DubbingPost::query()
            ->with([
                'organization:id,name,slug,avatar_path,is_verified',
                'author:id,name,stage_name,username,avatar_path',
                'playlist:id,title,slug',
                'season:id,playlist_id,season_number,title',
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
                'tags:id,name,slug',
            ])
            ->withCount(['likes', 'comments', 'views']);

        if (! $user) {
            $query->where('visibility', 'public')->whereNotNull('published_at');
        } else {
            $query->where(function ($builder) use ($user) {
                $builder
                    ->where(function ($inner) {
                        $inner->where('visibility', 'public')->whereNotNull('published_at');
                    })
                    ->orWhere('author_user_id', $user->id)
                    ->orWhereExists(function ($exists) use ($user) {
                        $exists->select(DB::raw(1))
                            ->from('post_collaborators')
                            ->whereColumn('post_collaborators.post_id', 'dubbing_posts.id')
                            ->where('post_collaborators.user_id', $user->id)
                            ->where('post_collaborators.status', 'accepted');
                    })
                    ->orWhereExists(function ($exists) use ($user) {
                        $exists->select(DB::raw(1))
                            ->from('organization_members')
                            ->whereColumn('organization_members.organization_id', 'dubbing_posts.organization_id')
                            ->where('organization_members.user_id', $user->id)
                            ->where('organization_members.status', 'active');
                    });
            });
        }

        if ($term = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($term) {
                $builder->where('title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            });
        }

        if ($organizationSlug = $request->string('organization')->toString()) {
            $query->whereHas('organization', fn ($builder) => $builder->where('slug', $organizationSlug));
        }

        if ($playlistId = $request->integer('playlist_id')) {
            $query->where('playlist_id', $playlistId);
        }

        if ($seasonId = $request->integer('season_id')) {
            $query->where('season_id', $seasonId);
        }

        if ($mediaType = $request->string('media_type')->toString()) {
            $query->where('media_type', $mediaType);
        }

        if ($language = $request->string('language_code')->toString()) {
            $query->where('language_code', $language);
        }

        if ($tag = $request->string('tag')->toString()) {
            $query->whereHas('tags', fn ($builder) => $builder->where('slug', Str::slug($tag)));
        }

        if ($user) {
            $query->withExists([
                'likes as viewer_has_liked' => fn ($builder) => $builder->where('user_id', $user->id),
            ]);
        }

        $this->applyFeedOrdering($query, $user?->id);

        $cacheKey = sprintf(
            'posts:index:%s:%s',
            $user?->id ?? 'guest',
            md5($request->fullUrl())
        );

        $payload = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($query, $request, $user) {
            $paginator = $query->paginate((int) $request->integer('per_page', 12));
            PostViewerPermissions::attachToCollection($paginator->getCollection(), $user);
            MediaAccess::signPostCollection($paginator->getCollection());

            return $paginator->toArray();
        });

        return response()->json($payload);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user) {
            abort(401, 'Não autenticado.');
        }

        if (! OrganizationAccess::canPublish($user, $organization)) {
            abort(403, 'Sem permissao para publicar nesta organizacao.');
        }

        return $this->storeForContext($request, $organization, $user, false);
    }

    public function storeProfile(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user) {
            abort(401, 'Não autenticado.');
        }

        $organization = $this->resolveProfileOrganization($user);

        return $this->storeForContext($request, $organization, $user, true);
    }

    private function storeForContext(Request $request, Organization $organization, User $user, bool $isProfilePublish): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'media' => [
                'nullable',
                'file',
                'max:1048576',
                'mimetypes:video/mp4,video/quicktime,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/aac,audio/ogg',
            ],
            'media_assets' => ['nullable', 'array', 'min:1', 'max:40'],
            'media_assets.*' => [
                'file',
                'max:1048576',
                'mimetypes:video/mp4,video/quicktime,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/aac,audio/ogg,image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif',
            ],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'playlist_id' => ['nullable', 'integer', 'exists:playlists,id'],
            'season_id' => ['nullable', 'integer', 'exists:playlist_seasons,id'],
            'season_number' => ['nullable', 'integer', 'min:1', 'max:999'],
            'season_title' => ['nullable', 'string', 'max:255'],
            'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:3600'],
            'visibility' => ['nullable', Rule::in(['public', 'private', 'unlisted'])],
            'allow_comments' => ['nullable', 'boolean'],
            'show_likes_count' => ['nullable', 'boolean'],
            'show_views_count' => ['nullable', 'boolean'],
            'language_code' => ['required', 'string', 'max:10'],
            'work_title' => ['required', 'string', 'max:255'],
            'content_license' => ['nullable', Rule::in(['all_rights_reserved', 'allow_reshare_with_credit', 'allow_remix_with_credit'])],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'collaborator_ids' => ['nullable', 'array', 'max:20'],
            'collaborator_ids.*' => ['integer', 'exists:users,id', 'distinct'],
            'credits' => ['nullable', 'array', 'max:200'],
            'credits.*.character_name' => ['nullable', 'string', 'max:255'],
            'credits.*.dubber_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'credits.*.dubber_name' => ['nullable', 'string', 'max:255'],
        ]);

        if (
            $isProfilePublish
            && (
                ! empty($validated['playlist_id'])
                || ! empty($validated['season_id'])
                || ! empty($validated['season_number'])
            )
        ) {
            abort(422, 'Publicações de perfil não aceitam comunidade, playlist ou temporada.');
        }

        $playlist = null;
        if (! empty($validated['playlist_id'])) {
            $playlist = Playlist::query()->findOrFail($validated['playlist_id']);

            if ($playlist->organization_id !== $organization->id) {
                abort(422, 'Playlist nao pertence a organizacao.');
            }
        }

        $seasonId = $this->resolveSeasonId($playlist?->id, $validated, $user->id);

        $collaboratorIds = collect($validated['collaborator_ids'] ?? [])->filter(fn ($id) => $id !== $user->id)->unique()->values();

        $assetFiles = [];
        if ($request->hasFile('media_assets')) {
            $rawAssets = $request->file('media_assets');
            $assetFiles = is_array($rawAssets) ? $rawAssets : [$rawAssets];
        }

        if (empty($assetFiles) && $request->hasFile('media')) {
            $legacyMedia = $request->file('media');
            if ($legacyMedia instanceof UploadedFile) {
                $assetFiles = [$legacyMedia];
            }
        }

        if (empty($assetFiles)) {
            abort(422, 'Envie ao menos um arquivo de mídia.');
        }

        $storedAssets = collect($assetFiles)
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->map(function (UploadedFile $file): array {
                $mime = $file->getMimeType() ?? '';
                $type = Str::startsWith($mime, 'video/')
                    ? 'video'
                    : (Str::startsWith($mime, 'audio/')
                        ? 'audio'
                        : (Str::startsWith($mime, 'image/') ? 'image' : 'unknown'));

                if ($type === 'unknown') {
                    abort(422, 'Tipo de mídia não suportado.');
                }

                return [
                    'path' => $file->store('dubbing-media', 'local'),
                    'type' => $type,
                    'mime' => $mime,
                    'size_bytes' => (int) $file->getSize(),
                ];
            })
            ->values();

        $primaryAsset = $storedAssets->firstWhere('type', 'video')
            ?? $storedAssets->firstWhere('type', 'audio')
            ?? $storedAssets->first();

        if (! is_array($primaryAsset)) {
            abort(422, 'Não foi possível processar os arquivos enviados.');
        }

        $thumbnailPath = $request->file('thumbnail')?->store('dubbing-thumbnails', 'local')
            ?? ($storedAssets->firstWhere('type', 'image')['path'] ?? null);
        $durationSeconds = max(1, min(3600, (int) ($validated['duration_seconds'] ?? 0)));

        $post = DB::transaction(function () use ($validated, $organization, $user, $seasonId, $primaryAsset, $thumbnailPath, $collaboratorIds, $storedAssets, $durationSeconds, $isProfilePublish) {
            $post = DubbingPost::create([
                'organization_id' => $organization->id,
                'playlist_id' => $validated['playlist_id'] ?? null,
                'author_user_id' => $user->id,
                'season_id' => $seasonId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'media_path' => $primaryAsset['path'],
                'media_type' => $primaryAsset['type'],
                'media_size_bytes' => (int) ($primaryAsset['size_bytes'] ?? 0),
                'thumbnail_path' => $thumbnailPath,
                'duration_seconds' => $durationSeconds,
                'visibility' => $validated['visibility'] ?? 'public',
                'allow_comments' => $validated['allow_comments'] ?? true,
                'language_code' => $validated['language_code'],
                'content_license' => $validated['content_license'] ?? 'all_rights_reserved',
                'published_at' => $collaboratorIds->isEmpty() ? now() : null,
                'metadata' => [
                    'work_title' => $validated['work_title'],
                    'publish_target' => $isProfilePublish ? 'profile' : 'community',
                    'requires_collaborator_approval' => ! $collaboratorIds->isEmpty(),
                    'display_metrics' => [
                        'show_likes' => $validated['show_likes_count'] ?? true,
                        'show_views' => $validated['show_views_count'] ?? true,
                    ],
                    'assets' => $storedAssets->all(),
                ],
            ]);

            $this->syncTags($post, $validated['tags'] ?? []);
            $this->syncCredits($post, $validated['credits'] ?? []);

            foreach ($collaboratorIds as $collaboratorId) {
                PostCollaborator::create([
                    'post_id' => $post->id,
                    'user_id' => $collaboratorId,
                    'invited_by_user_id' => $user->id,
                    'status' => 'pending',
                ]);
            }

            return $post;
        });

        if ($collaboratorIds->isNotEmpty()) {
            $post->load('author');
            foreach ($post->collaborators()->with('user')->get() as $collaborator) {
                $collaborator->user?->notify(new PostCollaborationRequested($post, $post->author));
            }
        } elseif ($post->published_at !== null) {
            if (! $isProfilePublish) {
                $this->notifyOrganizationMembersAboutPublication($post);
            }
            app(AchievementEngine::class)->onEpisodePublished($post);
        }

        if (! $isProfilePublish) {
            $organization->recalculateVerification();
        }

        Log::channel('audit')->info('post_created', [
            'post_id' => $post->id,
            'organization_id' => $organization->id,
            'author_user_id' => $user->id,
            'playlist_id' => $post->playlist_id,
            'season_id' => $post->season_id,
            'publish_target' => $isProfilePublish ? 'profile' : 'community',
            'published_at' => optional($post->published_at)->toIso8601String(),
        ]);

        return response()->json([
            'post' => $this->loadPost($post->id, $user),
            'message' => $collaboratorIds->isEmpty()
                ? 'Post publicado com sucesso.'
                : 'Post criado. Publicacao pendente de aprovacao dos colaboradores.',
        ], 201);
    }

    private function notifyOrganizationMembersAboutPublication(DubbingPost $post): void
    {
        if ($this->isProfilePost($post)) {
            return;
        }

        $post->loadMissing('organization');

        $members = $post->organization->users()
            ->wherePivot('status', 'active')
            ->where('users.id', '!=', $post->author_user_id)
            ->distinct('users.id')
            ->get();

        $followers = $post->organization->followers()
            ->where('users.id', '!=', $post->author_user_id)
            ->distinct('users.id')
            ->get();

        $recipients = $members
            ->merge($followers)
            ->unique('id')
            ->values();

        foreach ($recipients as $recipient) {
            $recipient->notify(new OrganizationPublishedPost($post));
        }
    }

    private function applyFeedOrdering(Builder $query, ?int $userId): void
    {
        $engagementSince = now()->subDays(7)->toDateTimeString();
        $freshStrong = now()->subDays(2)->toDateTimeString();
        $freshSoft = now()->subDays(7)->toDateTimeString();

        $recentCommentsExpr = '(SELECT COUNT(*) FROM comments WHERE comments.post_id = dubbing_posts.id AND comments.deleted_at IS NULL AND comments.created_at >= ?)';
        $recentLikesExpr = '(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = dubbing_posts.id AND post_likes.created_at >= ?)';
        $recentViewsExpr = '(SELECT COUNT(*) FROM post_views WHERE post_views.post_id = dubbing_posts.id AND post_views.created_at >= ?)';

        $orderSql = "(
            ({$recentCommentsExpr}) * 3.0 +
            ({$recentLikesExpr}) * 2.0 +
            ({$recentViewsExpr}) * 0.08 +
            CASE
                WHEN dubbing_posts.published_at >= ? THEN 4
                WHEN dubbing_posts.published_at >= ? THEN 2
                ELSE 0
            END
        )";
        $bindings = [$engagementSince, $engagementSince, $engagementSince, $freshStrong, $freshSoft];

        if ($userId) {
            $profile = $this->buildPersonalizationProfile($userId);

            if (! empty($profile['author_ids'])) {
                $placeholders = implode(', ', array_fill(0, count($profile['author_ids']), '?'));
                $orderSql .= " + CASE WHEN dubbing_posts.author_user_id IN ({$placeholders}) THEN 5 ELSE 0 END";
                $bindings = [...$bindings, ...$profile['author_ids']];
            }

            if (! empty($profile['organization_ids'])) {
                $placeholders = implode(', ', array_fill(0, count($profile['organization_ids']), '?'));
                $orderSql .= " + CASE WHEN dubbing_posts.organization_id IN ({$placeholders}) THEN 2.5 ELSE 0 END";
                $bindings = [...$bindings, ...$profile['organization_ids']];
            }

            if (! empty($profile['playlist_ids'])) {
                $placeholders = implode(', ', array_fill(0, count($profile['playlist_ids']), '?'));
                $orderSql .= " + CASE WHEN dubbing_posts.playlist_id IN ({$placeholders}) THEN 2 ELSE 0 END";
                $bindings = [...$bindings, ...$profile['playlist_ids']];
            }

            if (! empty($profile['tag_ids'])) {
                $placeholders = implode(', ', array_fill(0, count($profile['tag_ids']), '?'));
                $orderSql .= " + ((SELECT COUNT(*) FROM dubbing_post_tag WHERE dubbing_post_tag.post_id = dubbing_posts.id AND dubbing_post_tag.tag_id IN ({$placeholders})) * 3.5)";
                $bindings = [...$bindings, ...$profile['tag_ids']];
            }

            if (! empty($profile['keywords'])) {
                $keywordMatches = [];
                foreach ($profile['keywords'] as $keyword) {
                    $keywordMatches[] = "(CASE WHEN LOWER(dubbing_posts.title) LIKE ? OR LOWER(COALESCE(dubbing_posts.description, '')) LIKE ? THEN 1 ELSE 0 END)";
                    $like = '%'.$keyword.'%';
                    $bindings[] = $like;
                    $bindings[] = $like;
                }
                $orderSql .= ' + ('.implode(' + ', $keywordMatches).')';
            }

            if (! empty($profile['work_titles'])) {
                $workExpr = $this->metadataWorkTitleExpression();
                $placeholders = implode(', ', array_fill(0, count($profile['work_titles']), '?'));
                $orderSql .= " + CASE WHEN {$workExpr} IN ({$placeholders}) THEN 6 ELSE 0 END";
                $bindings = [...$bindings, ...$profile['work_titles']];
            }
        }

        $query->orderByRaw($orderSql.' DESC', $bindings)
            ->orderByDesc('published_at')
            ->orderByDesc('created_at');
    }

    /**
     * @return array{
     *   author_ids: array<int>,
     *   organization_ids: array<int>,
     *   playlist_ids: array<int>,
     *   tag_ids: array<int>,
     *   keywords: array<string>,
     *   work_titles: array<string>
     * }
     */
    private function buildPersonalizationProfile(int $userId): array
    {
        $likedPostIds = PostLike::query()
            ->where('user_id', $userId)
            ->latest('created_at')
            ->limit(160)
            ->pluck('post_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $commentedPostIds = Comment::query()
            ->where('user_id', $userId)
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->limit(160)
            ->pluck('post_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $interactedPostIds = collect([...$likedPostIds, ...$commentedPostIds])
            ->filter(static fn ($id): bool => $id > 0)
            ->unique()
            ->take(220)
            ->values();

        if ($interactedPostIds->isEmpty()) {
            return [
                'author_ids' => [],
                'organization_ids' => [],
                'playlist_ids' => [],
                'tag_ids' => [],
                'keywords' => [],
                'work_titles' => [],
            ];
        }

        $interactedPosts = DubbingPost::query()
            ->whereIn('id', $interactedPostIds->all())
            ->get(['id', 'author_user_id', 'organization_id', 'playlist_id', 'title', 'description', 'metadata']);

        $tagIds = DB::table('dubbing_post_tag')
            ->select('tag_id', DB::raw('COUNT(*) AS score'))
            ->whereIn('post_id', $interactedPostIds->all())
            ->groupBy('tag_id')
            ->orderByDesc('score')
            ->limit(24)
            ->pluck('tag_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $authorIds = $interactedPosts
            ->pluck('author_user_id')
            ->filter(static fn ($id): bool => is_numeric($id))
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->take(24)
            ->values()
            ->all();

        $organizationIds = $interactedPosts
            ->pluck('organization_id')
            ->filter(static fn ($id): bool => is_numeric($id))
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->take(24)
            ->values()
            ->all();

        $playlistIds = $interactedPosts
            ->pluck('playlist_id')
            ->filter(static fn ($id): bool => is_numeric($id))
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->take(24)
            ->values()
            ->all();

        $workTitles = $interactedPosts
            ->map(function (DubbingPost $post): ?string {
                $metadata = is_array($post->metadata) ? $post->metadata : [];
                $value = isset($metadata['work_title']) ? trim((string) $metadata['work_title']) : '';
                if ($value === '') {
                    return null;
                }

                return mb_strtolower($value);
            })
            ->filter(static fn (?string $title): bool => $title !== null && mb_strlen($title) >= 2)
            ->unique()
            ->take(16)
            ->values()
            ->all();

        $keywordTexts = [];
        foreach ($interactedPosts as $post) {
            $keywordTexts[] = (string) $post->title;
            if (! empty($post->description)) {
                $keywordTexts[] = (string) $post->description;
            }
            $metadata = is_array($post->metadata) ? $post->metadata : [];
            if (! empty($metadata['work_title'])) {
                $keywordTexts[] = (string) $metadata['work_title'];
            }
        }

        return [
            'author_ids' => $authorIds,
            'organization_ids' => $organizationIds,
            'playlist_ids' => $playlistIds,
            'tag_ids' => $tagIds,
            'keywords' => $this->extractTopKeywords($keywordTexts, 10),
            'work_titles' => $workTitles,
        ];
    }

    /**
     * @param  array<int, string>  $texts
     * @return array<int, string>
     */
    private function extractTopKeywords(array $texts, int $limit): array
    {
        $stopWords = [
            'a', 'o', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'é', 'em', 'no', 'na', 'nos', 'nas',
            'um', 'uma', 'uns', 'umas', 'por', 'para', 'com', 'sem', 'que', 'se', 'ao', 'aos', 'à', 'às',
            'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'you',
        ];

        $frequency = [];

        foreach ($texts as $text) {
            $normalized = mb_strtolower(trim($text));
            if ($normalized === '') {
                continue;
            }

            $tokens = preg_split('/[^\p{L}\p{N}]+/u', $normalized) ?: [];

            foreach ($tokens as $token) {
                if ($token === '' || mb_strlen($token) < 3 || in_array($token, $stopWords, true)) {
                    continue;
                }

                if (preg_match('/^\d+$/', $token) === 1) {
                    continue;
                }

                $frequency[$token] = ($frequency[$token] ?? 0) + 1;
            }
        }

        arsort($frequency);

        return array_slice(array_keys($frequency), 0, max(1, $limit));
    }

    private function metadataWorkTitleExpression(): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'pgsql' => "LOWER(COALESCE(dubbing_posts.metadata->>'work_title', ''))",
            'sqlite' => "LOWER(COALESCE(json_extract(dubbing_posts.metadata, '$.work_title'), ''))",
            default => "LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(dubbing_posts.metadata, '$.work_title')), ''))",
        };
    }

    public function show(DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! $this->canViewPost($post, $user?->id)) {
            abort(403, 'Sem permissao para visualizar este post.');
        }

        return response()->json([
            'post' => $this->loadPost($post->id, $user),
        ]);
    }

    public function update(Request $request, DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canEditPost($user, $post)) {
            abort(403, 'Sem permissao para editar este post.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'playlist_id' => ['nullable', 'integer', 'exists:playlists,id'],
            'season_id' => ['nullable', 'integer', 'exists:playlist_seasons,id'],
            'season_number' => ['nullable', 'integer', 'min:1', 'max:999'],
            'season_title' => ['nullable', 'string', 'max:255'],
            'duration_seconds' => ['sometimes', 'integer', 'min:1', 'max:3600'],
            'visibility' => ['nullable', Rule::in(['public', 'private', 'unlisted'])],
            'allow_comments' => ['nullable', 'boolean'],
            'show_likes_count' => ['nullable', 'boolean'],
            'show_views_count' => ['nullable', 'boolean'],
            'language_code' => ['sometimes', 'string', 'max:10'],
            'work_title' => ['sometimes', 'string', 'max:255'],
            'content_license' => ['nullable', Rule::in(['all_rights_reserved', 'allow_reshare_with_credit', 'allow_remix_with_credit'])],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'credits' => ['nullable', 'array', 'max:200'],
            'credits.*.character_name' => ['nullable', 'string', 'max:255'],
            'credits.*.dubber_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'credits.*.dubber_name' => ['nullable', 'string', 'max:255'],
        ]);

        $targetPlaylistId = $validated['playlist_id'] ?? $post->playlist_id;
        if ($targetPlaylistId !== null) {
            $playlist = Playlist::query()->findOrFail($targetPlaylistId);
            if ($playlist->organization_id !== $post->organization_id) {
                abort(422, 'Playlist nao pertence a organizacao do post.');
            }
        }

        $seasonId = $this->resolveSeasonId($targetPlaylistId, $validated, $user->id, $post->season_id);

        $metadata = is_array($post->metadata) ? $post->metadata : [];
        if (isset($validated['work_title'])) {
            $metadata['work_title'] = $validated['work_title'];
        }
        $displayMetrics = is_array($metadata['display_metrics'] ?? null) ? $metadata['display_metrics'] : [];
        if (array_key_exists('show_likes_count', $validated)) {
            $displayMetrics['show_likes'] = (bool) $validated['show_likes_count'];
        }
        if (array_key_exists('show_views_count', $validated)) {
            $displayMetrics['show_views'] = (bool) $validated['show_views_count'];
        }
        if (! empty($displayMetrics)) {
            $metadata['display_metrics'] = $displayMetrics;
        }

        $post->fill([
            'title' => $validated['title'] ?? $post->title,
            'description' => $validated['description'] ?? $post->description,
            'playlist_id' => $validated['playlist_id'] ?? $post->playlist_id,
            'season_id' => $seasonId,
            'duration_seconds' => $validated['duration_seconds'] ?? $post->duration_seconds,
            'visibility' => $validated['visibility'] ?? $post->visibility,
            'allow_comments' => $validated['allow_comments'] ?? $post->allow_comments,
            'language_code' => $validated['language_code'] ?? $post->language_code,
            'content_license' => $validated['content_license'] ?? $post->content_license,
            'metadata' => $metadata,
        ])->save();

        if (array_key_exists('tags', $validated)) {
            $this->syncTags($post, $validated['tags'] ?? []);
        }

        if (array_key_exists('credits', $validated)) {
            $this->syncCredits($post, $validated['credits'] ?? []);
        }

        Log::channel('audit')->info('post_updated', [
            'post_id' => $post->id,
            'organization_id' => $post->organization_id,
            'updated_by_user_id' => $user->id,
            'playlist_id' => $post->playlist_id,
            'season_id' => $post->season_id,
        ]);

        return response()->json([
            'post' => $this->loadPost($post->id, $user),
            'message' => 'Post atualizado com sucesso.',
        ]);
    }

    public function destroy(DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canDeletePost($user, $post)) {
            abort(403, 'Sem permissao para remover este post.');
        }

        $isProfilePost = $this->isProfilePost($post);
        $organization = $post->organization;
        $postId = $post->id;
        $post->delete();
        if (! $isProfilePost) {
            $organization->recalculateVerification();
        }

        Log::channel('audit')->info('post_deleted', [
            'post_id' => $postId,
            'organization_id' => $organization->id,
            'deleted_by_user_id' => $user->id,
            'publish_target' => $isProfilePost ? 'profile' : 'community',
        ]);

        return response()->json([
            'message' => 'Post removido com sucesso.',
        ]);
    }

    private function canViewPost(DubbingPost $post, ?int $viewerId): bool
    {
        if ($post->visibility === 'public' && $post->published_at !== null) {
            return true;
        }

        if (! $viewerId) {
            return false;
        }

        if ($post->author_user_id === $viewerId) {
            return true;
        }

        if ($this->isProfilePost($post)) {
            return $post->collaborators()
                ->where('user_id', $viewerId)
                ->where('status', 'accepted')
                ->exists();
        }

        $isOrgMember = $post->organization->members()
            ->where('user_id', $viewerId)
            ->where('status', 'active')
            ->exists();

        if ($isOrgMember) {
            return true;
        }

        return $post->collaborators()
            ->where('user_id', $viewerId)
            ->where('status', 'accepted')
            ->exists();
    }

    private function loadPost(int $postId, ?User $viewer = null): DubbingPost
    {
        $post = DubbingPost::query()
            ->with([
                'organization:id,name,slug,avatar_path,is_verified',
                'author:id,name,stage_name,username,avatar_path',
                'playlist:id,title,slug',
                'season:id,playlist_id,season_number,title',
                'collaborators' => fn ($builder) => $builder->with('user:id,name,stage_name,username,avatar_path')->orderByDesc('created_at'),
                'credits' => fn ($builder) => $builder->with('dubber:id,name,stage_name,username,avatar_path')->orderBy('display_order'),
                'tags:id,name,slug',
                'comments' => fn ($builder) => $builder
                    ->whereNull('parent_id')
                    ->with([
                        'user:id,name,stage_name,username,avatar_path',
                        'replies' => fn ($replyBuilder) => $replyBuilder
                            ->with('user:id,name,stage_name,username,avatar_path')
                            ->latest()
                            ->limit(8),
                    ])
                    ->latest()
                    ->limit(50),
            ])
            ->withCount(['likes', 'comments', 'views'])
            ->findOrFail($postId);

        PostViewerPermissions::attachToCollection(collect([$post]), $viewer);
        MediaAccess::signPost($post);

        return $post;
    }

    /**
     * @param  array<string,mixed>  $validated
     */
    private function resolveSeasonId(?int $playlistId, array $validated, int $userId, ?int $currentSeasonId = null): ?int
    {
        if ($playlistId === null) {
            if (! empty($validated['season_id']) || ! empty($validated['season_number'])) {
                abort(422, 'Selecione uma playlist para definir a temporada.');
            }

            return null;
        }

        if (array_key_exists('season_id', $validated) && $validated['season_id'] !== null) {
            $season = PlaylistSeason::query()->findOrFail($validated['season_id']);
            if ($season->playlist_id !== $playlistId) {
                abort(422, 'A temporada selecionada não pertence à playlist.');
            }

            return $season->id;
        }

        if (array_key_exists('season_number', $validated) && $validated['season_number'] !== null) {
            $season = PlaylistSeason::query()->firstOrCreate(
                [
                    'playlist_id' => $playlistId,
                    'season_number' => $validated['season_number'],
                ],
                [
                    'title' => $validated['season_title'] ?? null,
                    'created_by_user_id' => $userId,
                ]
            );

            if (! $season->wasRecentlyCreated && ! empty($validated['season_title']) && $season->title !== $validated['season_title']) {
                $season->title = $validated['season_title'];
                $season->save();
            }

            return $season->id;
        }

        return $currentSeasonId;
    }

    /**
     * @param  array<int, string>  $tagNames
     */
    private function syncTags(DubbingPost $post, array $tagNames): void
    {
        $tagIds = collect($tagNames)
            ->map(fn ($tag) => trim($tag))
            ->filter(fn ($tag) => $tag !== '')
            ->unique()
            ->take(10)
            ->map(function ($tagName) {
                $slug = Str::slug($tagName);
                if ($slug === '') {
                    return null;
                }

                return Tag::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => $tagName]
                )->id;
            })
            ->filter()
            ->values()
            ->all();

        $post->tags()->sync($tagIds);
    }

    /**
     * @param  array<int, array<string, mixed>>  $credits
     */
    private function syncCredits(DubbingPost $post, array $credits): void
    {
        $post->credits()->delete();

        foreach (array_values($credits) as $index => $credit) {
            $characterName = is_string($credit['character_name'] ?? null)
                ? trim((string) $credit['character_name'])
                : null;
            $dubberUserId = isset($credit['dubber_user_id']) && $credit['dubber_user_id'] !== ''
                ? (int) $credit['dubber_user_id']
                : null;
            $dubberName = is_string($credit['dubber_name'] ?? null)
                ? trim((string) $credit['dubber_name'])
                : null;

            if ($dubberUserId === null && $dubberName) {
                $normalizedName = mb_strtolower($dubberName);
                $matchedUser = User::query()
                    ->whereRaw('LOWER(username) = ?', [$normalizedName])
                    ->orWhereRaw('LOWER(stage_name) = ?', [$normalizedName])
                    ->orWhereRaw('LOWER(name) = ?', [$normalizedName])
                    ->first(['id', 'name', 'stage_name']);

                if ($matchedUser) {
                    $dubberUserId = $matchedUser->id;
                    $dubberName = $matchedUser->stage_name ?: $matchedUser->name;
                }
            }

            if ($dubberUserId !== null && ! $dubberName) {
                $dubber = User::query()->find($dubberUserId, ['name', 'stage_name']);
                $dubberName = $dubber?->stage_name ?: $dubber?->name;
            }

            if ($characterName === '') {
                $characterName = null;
            }

            if ($dubberName === '') {
                $dubberName = null;
            }

            if (! $characterName && ! $dubberUserId && ! $dubberName) {
                continue;
            }

            PostCredit::create([
                'post_id' => $post->id,
                'character_name' => $characterName,
                'dubber_user_id' => $dubberUserId,
                'dubber_name' => $dubberName,
                'display_order' => $index,
            ]);
        }
    }

    private function isProfilePost(DubbingPost $post): bool
    {
        $metadata = is_array($post->metadata) ? $post->metadata : [];

        return ($metadata['publish_target'] ?? null) === 'profile';
    }

    private function resolveProfileOrganization(User $user): Organization
    {
        $ownedOrganizations = Organization::query()
            ->where('owner_user_id', $user->id)
            ->get(['id', 'owner_user_id', 'name', 'slug', 'settings']);

        foreach ($ownedOrganizations as $organization) {
            $settings = is_array($organization->settings) ? $organization->settings : [];
            if (($settings['is_profile_space'] ?? false) === true) {
                return $organization;
            }
        }

        $baseSlug = 'perfil-pessoal-u'.$user->id;
        $candidate = $baseSlug;
        $suffix = 2;

        while (Organization::query()->where('slug', $candidate)->exists()) {
            $candidate = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        $displayName = trim((string) ($user->stage_name ?: $user->name));
        if ($displayName === '') {
            $displayName = 'Perfil';
        }

        return Organization::query()->create([
            'owner_user_id' => $user->id,
            'name' => 'Perfil de '.$displayName,
            'slug' => $candidate,
            'description' => 'Espaço de publicações avulsas do perfil.',
            'is_public' => false,
            'is_verified' => false,
            'settings' => [
                'is_profile_space' => true,
            ],
        ]);
    }
}
