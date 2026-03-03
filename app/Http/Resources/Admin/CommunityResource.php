<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $owner = $this->whenLoaded('owner');

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'website_url' => $this->website_url,
            'avatar' => $this->avatar_path ? $this->normalizeMediaUrl((string) $this->avatar_path) : null,
            'cover' => $this->cover_path ? $this->normalizeMediaUrl((string) $this->cover_path) : null,
            'is_public' => (bool) $this->is_public,
            'is_verified' => (bool) $this->is_verified,
            'is_active' => (bool) ($this->is_active ?? true),
            'owner' => $owner ? [
                'id' => $owner->id,
                'uuid' => $owner->uuid,
                'name' => $owner->name,
                'email' => $owner->email,
            ] : null,
            'members_count' => $this->when(isset($this->members_count), (int) $this->members_count),
            'followers_count' => $this->when(isset($this->followers_count), (int) $this->followers_count),
            'posts_count' => $this->when(isset($this->posts_count), (int) $this->posts_count),
            'playlists_count' => $this->when(isset($this->playlists_count), (int) $this->playlists_count),
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
