<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\PostResource;
use App\Models\DubbingPost;
use App\Models\User;
use App\Support\MediaAccess;
use App\Support\PostViewerPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PostsController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'title',
        'visibility',
        'published_at',
        'created_at',
        'updated_at',
        'likes_count',
        'comments_count',
        'views_count',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'author_uuid' => ['sometimes', 'nullable', 'uuid'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,unlisted'],
            'is_published' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return PostResource::collection($items);
    }

    public function show(Request $request, string $postId): JsonResponse
    {
        $post = DubbingPost::query()
            ->with([
                'organization:id,name,slug,avatar_path,is_verified',
                'author:id,uuid,name,email,stage_name,username,avatar_path',
                'playlist:id,title,slug',
                'season:id,playlist_id,season_number,title',
                'collaborators' => fn ($builder) => $builder
                    ->with('user:id,uuid,name,email,stage_name,username,avatar_path')
                    ->orderByDesc('created_at'),
                'credits' => fn ($builder) => $builder
                    ->with('dubber:id,uuid,name,email,stage_name,username,avatar_path')
                    ->orderBy('display_order'),
                'tags:id,name,slug',
                'comments' => fn ($builder) => $builder
                    ->whereNull('parent_id')
                    ->with([
                        'user:id,uuid,name,email,stage_name,username,avatar_path',
                        'replies' => fn ($replyBuilder) => $replyBuilder
                            ->with('user:id,uuid,name,email,stage_name,username,avatar_path')
                            ->latest()
                            ->limit(8),
                    ])
                    ->latest()
                    ->limit(50),
            ])
            ->withCount(['likes', 'comments', 'views'])
            ->where('id', (int) $postId)
            ->firstOrFail();

        PostViewerPermissions::attachToCollection(collect([$post]), $this->currentUser());
        MediaAccess::signPost($post);

        $resource = (new PostResource($post))->toArray($request);

        return response()->json([
            'data' => [
                ...$resource,
                // Payload completo para renderizações detalhadas no admin.
                'site_post_payload' => $post,
                'site_preview_url' => rtrim((string) config('app.frontend_url'), '/').'/pt-BR/post/'.$post->id,
            ],
        ]);
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = DubbingPost::query()
            ->with([
                'organization:id,name,slug,avatar_path,is_verified',
                'author:id,uuid,name,email,stage_name,avatar_path',
                'playlist:id,title,slug',
                'season:id,playlist_id,season_number,title',
            ])
            ->withCount(['likes', 'comments', 'views']);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        if ($request->filled('author_uuid')) {
            $authorId = User::query()->where('uuid', $request->string('author_uuid')->toString())->value('id');
            if ($authorId) {
                $query->where('author_user_id', $authorId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('visibility')) {
            $query->where('visibility', $request->string('visibility')->toString());
        }

        if ($request->filled('is_published')) {
            if ((int) $request->integer('is_published') === 1) {
                $query->whereNotNull('published_at');
            } else {
                $query->whereNull('published_at');
            }
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function (Builder $builder) use ($search): void {
                $workTitleExpression = match (DB::connection()->getDriverName()) {
                    'pgsql' => "LOWER(COALESCE(dubbing_posts.metadata->>'work_title', ''))",
                    'sqlite' => "LOWER(COALESCE(json_extract(dubbing_posts.metadata, '$.work_title'), ''))",
                    default => "LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(dubbing_posts.metadata, '$.work_title')), ''))",
                };

                $builder->where('dubbing_posts.id', 'like', '%'.$search.'%')
                    ->orWhere('dubbing_posts.title', 'like', '%'.$search.'%')
                    ->orWhere('dubbing_posts.description', 'like', '%'.$search.'%')
                    ->orWhereRaw($workTitleExpression.' LIKE ?', ['%'.mb_strtolower($search).'%'])
                    ->orWhereHas('organization', fn (Builder $organizationBuilder) => $organizationBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('slug', 'like', '%'.$search.'%'))
                    ->orWhereHas('author', fn (Builder $authorBuilder) => $authorBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('stage_name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('uuid', 'like', '%'.$search.'%'));
            });
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end'], 'dubbing_posts.created_at');

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $column = match ($item['name']) {
                'likes_count' => 'likes_count',
                'comments_count' => 'comments_count',
                'views_count' => 'views_count',
                default => 'dubbing_posts.'.$item['name'],
            };

            $query->orderBy($column, $item['sort']);
        }

        return $query;
    }
}
