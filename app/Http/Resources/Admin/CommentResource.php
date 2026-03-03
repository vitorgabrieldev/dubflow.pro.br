<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');
        $post = $this->whenLoaded('post');

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'post_id' => $this->post_id,
            'post' => $post ? [
                'id' => $post->id,
                'uuid' => (string) $post->id,
                'title' => $post->title,
            ] : null,
            'user_id' => $this->user_id,
            'user' => $user ? [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'parent_id' => $this->parent_id,
            'body' => $this->body,
            'edited_at' => $this->edited_at?->toAtomString(),
            'is_deleted' => $this->trashed(),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'deleted_at' => $this->deleted_at?->toAtomString(),
        ];
    }
}
