<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\PostCollaborator;
use App\Models\PostLike;
use App\Models\PostView;
use App\Models\User;
use App\Notifications\OrganizationPublishedPost;
use App\Notifications\PostCollaborationRequested;
use App\Notifications\PostCollaborationResponded;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PostInteractionController extends Controller
{
    public function like(DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! $this->canViewPost($post, $user?->id)) {
            abort(403, 'Sem permissao para curtir este post.');
        }

        PostLike::query()->firstOrCreate([
            'post_id' => $post->id,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Curtida registrada.',
            'likes_count' => $post->likes()->count(),
        ]);
    }

    public function unlike(DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        PostLike::query()
            ->where('post_id', $post->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'Curtida removida.',
            'likes_count' => $post->likes()->count(),
        ]);
    }

    public function storeComment(Request $request, DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! $post->allow_comments) {
            abort(422, 'Comentarios desativados para este post.');
        }

        if (! $this->canViewPost($post, $user?->id)) {
            abort(403, 'Sem permissao para comentar.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1500'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ]);

        if (! empty($validated['parent_id'])) {
            $parent = Comment::query()->findOrFail($validated['parent_id']);

            if ($parent->post_id !== $post->id) {
                abort(422, 'Comentario pai invalido para este post.');
            }

            // Limita a 2 niveis: resposta apenas em comentarios da raiz.
            if ($parent->parent_id !== null) {
                abort(422, 'Respostas so podem ser criadas em comentarios da raiz.');
            }
        }

        $comment = Comment::create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
        ]);

        return response()->json([
            'message' => 'Comentario publicado.',
            'comment' => $comment->load('user:id,name,stage_name,username,avatar_path'),
        ], 201);
    }

    public function updateComment(Request $request, Comment $comment): JsonResponse
    {
        $user = auth('api')->user();

        if ($comment->user_id !== $user->id) {
            abort(403, 'Voce so pode editar seus comentarios.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1500'],
        ]);

        $comment->update([
            'body' => $validated['body'],
            'edited_at' => now(),
        ]);

        return response()->json([
            'message' => 'Comentario atualizado.',
            'comment' => $comment,
        ]);
    }

    public function deleteComment(Comment $comment): JsonResponse
    {
        $user = auth('api')->user();

        if ($comment->user_id !== $user->id) {
            $canModerate = OrganizationAccess::canManageOrganization($user, $comment->post->organization);
            if (! $canModerate) {
                abort(403, 'Sem permissao para remover este comentario.');
            }
        }

        $comment->delete();

        return response()->json([
            'message' => 'Comentario removido.',
        ]);
    }

    public function recordView(Request $request, DubbingPost $post): JsonResponse
    {
        if (! $this->canViewPost($post, auth('api')->id())) {
            abort(403, 'Sem permissao para registrar visualizacao.');
        }

        $validated = $request->validate([
            'watch_seconds' => ['nullable', 'integer', 'min:0', 'max:3600'],
        ]);

        $fingerprint = hash('sha256', ($request->ip() ?? 'ip').'|'.substr((string) $request->userAgent(), 0, 255));

        PostView::create([
            'post_id' => $post->id,
            'user_id' => auth('api')->id(),
            'session_fingerprint' => $fingerprint,
            'watch_seconds' => $validated['watch_seconds'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Visualizacao registrada.',
            'views_count' => $post->views()->count(),
        ]);
    }

    public function inviteCollaborator(Request $request, DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManagePost($user, $post)) {
            abort(403, 'Sem permissao para convidar colaboradores.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id', Rule::notIn([$post->author_user_id])],
        ]);

        $collaborator = PostCollaborator::query()->updateOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $validated['user_id'],
            ],
            [
                'invited_by_user_id' => $user->id,
                'status' => 'pending',
                'responded_at' => null,
            ]
        );

        if ($post->published_at !== null) {
            $post->update(['published_at' => null]);
        }

        $collaboratorUser = User::query()->find($validated['user_id']);
        if ($collaboratorUser) {
            $collaboratorUser->notify(new PostCollaborationRequested($post, $user));
        }

        return response()->json([
            'message' => 'Convite enviado.',
            'collaborator' => $collaborator,
        ], 201);
    }

    public function respondCollaboration(Request $request, DubbingPost $post): JsonResponse
    {
        $user = auth('api')->user();

        $validated = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'rejected'])],
        ]);

        $collaboration = PostCollaborator::query()
            ->where('post_id', $post->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $collaboration->update([
            'status' => $validated['status'],
            'responded_at' => now(),
        ]);

        if ($validated['status'] === 'rejected') {
            $post->update([
                'published_at' => null,
                'visibility' => 'private',
            ]);
        } else {
            $pendingCount = $post->collaborators()->where('status', 'pending')->count();
            $rejectedCount = $post->collaborators()->where('status', 'rejected')->count();

            if ($pendingCount === 0 && $rejectedCount === 0 && $post->published_at === null) {
                $post->update([
                    'published_at' => now(),
                ]);

                $this->notifyFollowersAboutPublication($post);
            }
        }

        $post->author?->notify(new PostCollaborationResponded($post, $user, $validated['status']));

        return response()->json([
            'message' => 'Resposta registrada.',
            'collaboration' => $collaboration,
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

        if ($post->organization->members()->where('user_id', $viewerId)->where('status', 'active')->exists()) {
            return true;
        }

        return $post->collaborators()->where('user_id', $viewerId)->where('status', 'accepted')->exists();
    }

    private function notifyFollowersAboutPublication(DubbingPost $post): void
    {
        $post->loadMissing('organization');

        $followers = $post->organization->followers()
            ->where('users.id', '!=', $post->author_user_id)
            ->get();

        foreach ($followers as $follower) {
            $follower->notify(new OrganizationPublishedPost($post));
        }
    }
}
