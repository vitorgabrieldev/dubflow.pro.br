<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $notifiable = $this->notifiable;

        return [
            'id' => $this->id,
            'uuid' => (string) $this->id,
            'type' => $this->type,
            'user' => $notifiable ? [
                'id' => $notifiable->id,
                'uuid' => $notifiable->uuid,
                'name' => $notifiable->name,
                'email' => $notifiable->email,
            ] : null,
            'data' => is_array($this->data) ? $this->data : [],
            'read_at' => $this->read_at?->toAtomString(),
            'is_read' => $this->read_at !== null,
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
        ];
    }
}
