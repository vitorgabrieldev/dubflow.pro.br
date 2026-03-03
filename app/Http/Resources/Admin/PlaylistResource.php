<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlaylistResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $organization = $this->whenLoaded('organization');

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'organization_id' => $this->organization_id,
            'organization' => $organization ? [
                'id' => $organization->id,
                'uuid' => (string) $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ] : null,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'work_title' => $this->work_title,
            'season_number' => $this->season_number,
            'release_year' => $this->release_year,
            'cover' => $this->cover_path ? $this->normalizeMediaUrl((string) $this->cover_path) : null,
            'visibility' => $this->visibility,
            'posts_count' => $this->when(isset($this->posts_count), (int) $this->posts_count),
            'seasons_count' => $this->when(isset($this->seasons_count), (int) $this->seasons_count),
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
