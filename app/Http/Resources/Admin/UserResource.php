<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $avatarUrl = $this->avatar_path ? $this->normalizeAvatarUrl((string) $this->avatar_path) : null;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $avatarUrl,
            'avatar_sizes' => [
                'admin_listing' => $avatarUrl,
                'admin_listing_medium' => $avatarUrl,
            ],
            'is_active' => (bool) $this->is_active,
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
            'permissions' => $this->whenLoaded('roles', fn () => $this->myPermissions()),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'deleted_at' => $this->deleted_at?->toAtomString(),
        ];
    }

    private function normalizeAvatarUrl(string $avatarPath): string
    {
        if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
            return $avatarPath;
        }

        if (str_starts_with($avatarPath, '/')) {
            return url($avatarPath);
        }

        return asset('storage/'.$avatarPath);
    }
}
