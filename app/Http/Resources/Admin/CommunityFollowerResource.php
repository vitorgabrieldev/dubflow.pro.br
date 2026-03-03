<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityFollowerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'is_active' => (bool) ($this->is_active ?? true),
            'followed_at' => $this->created_at?->toAtomString(),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'user' => $user ? [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'is_deleted' => (bool) $user->trashed(),
                'deleted_at' => $user->deleted_at?->toAtomString(),
            ] : null,
        ];
    }
}
