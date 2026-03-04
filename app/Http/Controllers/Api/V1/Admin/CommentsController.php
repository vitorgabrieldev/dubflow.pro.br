<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\CommentResource;
use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommentsController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'post_id',
        'user_id',
        'created_at',
        'updated_at',
        'edited_at',
        'deleted_at',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'post_id' => ['sometimes', 'nullable', 'integer'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'is_reply' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return CommentResource::collection($items);
    }

    public function show(string $commentId): CommentResource
    {
        $comment = $this->findCommentById($commentId, true);
        $comment->load([
            'user:id,uuid,name,email',
            'post:id,title',
        ]);

        return new CommentResource($comment);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'post_id' => ['required', 'integer', Rule::exists('dubbing_posts', 'id')],
            'user_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('comments', 'id')],
            'body' => ['required', 'string', 'max:3000'],
        ]);

        $user = User::query()->where('uuid', $validated['user_uuid'])->firstOrFail();

        $comment = Comment::query()->create([
            'post_id' => (int) $validated['post_id'],
            'user_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
            'edited_at' => null,
        ]);

        $comment->load([
            'user:id,uuid,name,email',
            'post:id,title',
        ]);

        $this->logAction('comments.create', 'Comentário #'.$comment->id, 'Criou um comentário', $comment);

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $commentId): CommentResource
    {
        $comment = $this->findCommentById($commentId, true);
        $before = $comment->replicate();

        $validated = $request->validate([
            'body' => ['sometimes', 'required', 'string', 'max:3000'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'uuid')],
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('comments', 'id')],
        ]);

        DB::transaction(function () use ($validated, $comment): void {
            if (array_key_exists('user_uuid', $validated) && ! empty($validated['user_uuid'])) {
                $user = User::query()->where('uuid', $validated['user_uuid'])->firstOrFail();
                $comment->user_id = $user->id;
            }

            if (array_key_exists('parent_id', $validated)) {
                $comment->parent_id = $validated['parent_id'];
            }

            if (array_key_exists('body', $validated)) {
                $comment->body = $validated['body'];
                $comment->edited_at = now();
            }

            $comment->save();
        });

        $comment->refresh()->load([
            'user:id,uuid,name,email',
            'post:id,title',
        ]);

        if ($comment->wasChanged()) {
            $this->logAction('comments.edit', 'Comentário #'.$comment->id, 'Editou um comentário', $comment, $before);
        }

        return new CommentResource($comment);
    }

    public function destroy(string $commentId): JsonResponse
    {
        $comment = $this->findCommentById($commentId, false);
        $before = $comment->replicate();

        $comment->delete();

        $this->logAction('comments.delete', 'Comentário #'.$comment->id, 'Excluiu (soft delete) um comentário', $comment, $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'post_id' => ['sometimes', 'nullable', 'integer'],
            'with_deleted' => ['sometimes', 'boolean'],
        ]);

        $query = Comment::query()->with([
            'user:id,uuid,name,email',
            'post:id,title',
        ]);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('post_id')) {
            $query->where('post_id', $request->integer('post_id'));
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('id', 'like', '%'.$search.'%')
                    ->orWhere('body', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn (Builder $userBuilder) => $userBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'))
                    ->orWhereHas('post', fn (Builder $postBuilder) => $postBuilder
                        ->where('title', 'like', '%'.$search.'%'));
            });
        }

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'post_id', 'user_id', 'created_at', 'updated_at', 'deleted_at',
        ], 'id', 'desc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return CommentResource::collection($query->limit(50)->get());
    }

    public function postsAutocomplete(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'post_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $query = DubbingPost::query()
            ->with([
                'organization:id,name',
                'author:id,uuid,name,email',
            ])
            ->select([
                'id',
                'organization_id',
                'author_user_id',
                'title',
                'description',
                'visibility',
                'published_at',
                'created_at',
            ]);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        if ($request->filled('post_id')) {
            $query->where('id', $request->integer('post_id'));
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('id', 'like', '%'.$search.'%')
                    ->orWhere('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhereHas('organization', fn (Builder $organizationBuilder) => $organizationBuilder
                        ->where('name', 'like', '%'.$search.'%'))
                    ->orWhereHas('author', fn (Builder $authorBuilder) => $authorBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'));
            });
        }

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'title', 'published_at', 'created_at',
        ], 'id', 'desc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        $posts = $query
            ->limit(50)
            ->get()
            ->map(static function (DubbingPost $post): array {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'organization' => $post->organization ? [
                        'id' => $post->organization->id,
                        'name' => $post->organization->name,
                    ] : null,
                    'author' => $post->author ? [
                        'uuid' => $post->author->uuid,
                        'name' => $post->author->name,
                        'email' => $post->author->email,
                    ] : null,
                    'visibility' => $post->visibility,
                    'published_at' => $post->published_at?->toAtomString(),
                    'created_at' => $post->created_at?->toAtomString(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $posts,
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'post_id' => ['sometimes', 'nullable', 'integer'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'is_reply' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'ID', 'value' => 'id'],
            ['name' => 'Post', 'value' => static fn ($item) => $item->post?->title],
            ['name' => 'Usuário', 'value' => static fn ($item) => $item->user?->name],
            ['name' => 'E-mail usuário', 'value' => static fn ($item) => $item->user?->email],
            ['name' => 'Resposta de', 'value' => 'parent_id'],
            ['name' => 'Comentário', 'value' => 'body'],
            ['name' => 'Editado em', 'value' => 'edited_at', 'format' => 'datetime'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
            ['name' => 'Deletado em', 'value' => 'deleted_at', 'format' => 'datetime'],
        ], $items, 'comments', 'Exportou comentários');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = Comment::query()->with([
            'user:id,uuid,name,email',
            'post:id,title',
        ]);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('post_id')) {
            $query->where('post_id', $request->integer('post_id'));
        }

        if ($request->filled('user_uuid')) {
            $userId = User::query()->where('uuid', $request->string('user_uuid')->toString())->value('id');
            if ($userId) {
                $query->where('user_id', $userId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('is_reply')) {
            if ($request->integer('is_reply') === 1) {
                $query->whereNotNull('parent_id');
            } else {
                $query->whereNull('parent_id');
            }
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('id', 'like', '%'.$search.'%')
                    ->orWhere('body', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn (Builder $userBuilder) => $userBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('uuid', 'like', '%'.$search.'%'))
                    ->orWhereHas('post', fn (Builder $postBuilder) => $postBuilder
                        ->where('title', 'like', '%'.$search.'%'));
            });
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    private function findCommentById(string $commentId, bool $withDeleted): Comment
    {
        $query = Comment::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where('id', (int) $commentId)->firstOrFail();
    }
}
