<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlatformUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $avatarUrl = $this->avatar_path ? $this->normalizeMediaUrl((string) $this->avatar_path) : null;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid ?: (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'stage_name' => $this->stage_name,
            'bio' => $this->bio,
            'state' => $this->state,
            'city' => $this->city,
            'avatar' => $avatarUrl,
            'is_active' => (bool) $this->is_active,
            'is_private' => (bool) $this->is_private,
            'is_deleted' => (bool) $this->trashed(),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'deleted_at' => $this->deleted_at?->toAtomString(),
        ];
    }

    private function normalizeMediaUrl(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/')) {
            return url($path);
        }

        return asset('storage/'.$path);
    }
}
