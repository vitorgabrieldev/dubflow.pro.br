<?php

namespace App\Http\Resources\Admin;

use App\Models\DubbingTestMedia;
use App\Support\MediaAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $organization = $this->whenLoaded('organization');
        $creator = $this->whenLoaded('creator');

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
            'created_by_user_id' => $this->created_by_user_id,
            'creator' => $creator ? [
                'id' => $creator->id,
                'uuid' => $creator->uuid,
                'name' => $creator->name,
                'email' => $creator->email,
            ] : null,
            'title' => $this->title,
            'description' => $this->description,
            'visibility' => $this->visibility,
            'status' => $this->status,
            'starts_at' => $this->starts_at?->toAtomString(),
            'ends_at' => $this->ends_at?->toAtomString(),
            'results_release_at' => $this->results_release_at?->toAtomString(),
            'characters_count' => $this->when(isset($this->characters_count), (int) $this->characters_count),
            'submissions_count' => $this->when(isset($this->submissions_count), (int) $this->submissions_count),
            'characters' => $this->whenLoaded('characters', fn () => $this->characters->map(fn ($character) => [
                'id' => $character->id,
                'name' => $character->name,
                'description' => $character->description,
                'expectations' => $character->expectations,
                'appearance_estimate' => $character->appearance_estimate,
                'position' => $character->position,
            ])->values()),
            'media' => $this->whenLoaded('media', fn () => $this->media->map(fn (DubbingTestMedia $media) => [
                'id' => $media->id,
                'media_type' => $media->media_type,
                'size_bytes' => $media->size_bytes,
                'sort_order' => $media->sort_order,
                'media_path' => MediaAccess::signPath((string) $media->media_path),
            ])->values()),
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
            'deleted_at' => $this->deleted_at?->toAtomString(),
        ];
    }
}
