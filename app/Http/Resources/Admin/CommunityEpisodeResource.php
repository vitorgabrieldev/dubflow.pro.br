<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityEpisodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $author = $this->whenLoaded('author');
        $playlist = $this->whenLoaded('playlist');
        $season = $this->whenLoaded('season');

        $isActive = $this->visibility === 'public' && $this->published_at !== null;

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'visibility' => $this->visibility,
            'is_active' => $isActive,
            'published_at' => $this->published_at?->toAtomString(),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'author' => $author ? [
                'id' => $author->id,
                'uuid' => $author->uuid,
                'name' => $author->name,
                'email' => $author->email,
                'is_active' => (bool) $author->is_active,
                'is_deleted' => (bool) $author->trashed(),
            ] : null,
            'playlist' => $playlist ? [
                'id' => $playlist->id,
                'uuid' => (string) $playlist->id,
                'title' => $playlist->title,
                'slug' => $playlist->slug,
                'work_title' => $playlist->work_title,
            ] : null,
            'season' => $season ? [
                'id' => $season->id,
                'uuid' => (string) $season->id,
                'season_number' => $season->season_number,
                'title' => $season->title,
            ] : null,
        ];
    }
}
