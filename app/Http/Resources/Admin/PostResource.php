<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $organization = $this->whenLoaded('organization');
        $author = $this->whenLoaded('author');
        $playlist = $this->whenLoaded('playlist');
        $season = $this->whenLoaded('season');
        $metadata = is_array($this->metadata) ? $this->metadata : [];

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'avatar' => ! empty($organization->avatar_path)
                    ? $this->normalizeMediaUrl((string) $organization->avatar_path)
                    : null,
                'is_verified' => (bool) ($organization->is_verified ?? false),
            ] : null,
            'author' => $author ? [
                'id' => $author->id,
                'uuid' => $author->uuid,
                'name' => $author->name,
                'stage_name' => $author->stage_name,
                'email' => $author->email,
                'avatar' => ! empty($author->avatar_path)
                    ? $this->normalizeMediaUrl((string) $author->avatar_path)
                    : null,
            ] : null,
            'playlist' => $playlist ? [
                'id' => $playlist->id,
                'title' => $playlist->title,
                'slug' => $playlist->slug,
            ] : null,
            'season' => $season ? [
                'id' => $season->id,
                'season_number' => $season->season_number,
                'title' => $season->title,
            ] : null,
            'media' => [
                'type' => $this->media_type,
                'path' => $this->media_path,
                'url' => ! empty($this->media_path) ? $this->normalizeMediaUrl((string) $this->media_path) : null,
                'thumbnail_path' => $this->thumbnail_path,
                'thumbnail_url' => ! empty($this->thumbnail_path)
                    ? $this->normalizeMediaUrl((string) $this->thumbnail_path)
                    : null,
            ],
            'duration_seconds' => (int) $this->duration_seconds,
            'visibility' => (string) $this->visibility,
            'allow_comments' => (bool) $this->allow_comments,
            'language_code' => $this->language_code,
            'content_license' => $this->content_license,
            'work_title' => isset($metadata['work_title']) ? (string) $metadata['work_title'] : null,
            'is_published' => $this->published_at !== null,
            'published_at' => $this->published_at?->toAtomString(),
            'likes_count' => isset($this->likes_count) ? (int) $this->likes_count : 0,
            'comments_count' => isset($this->comments_count) ? (int) $this->comments_count : 0,
            'views_count' => isset($this->views_count) ? (int) $this->views_count : 0,
            'site_url' => rtrim((string) config('app.frontend_url'), '/').'/pt-BR/post/'.$this->id,
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
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

