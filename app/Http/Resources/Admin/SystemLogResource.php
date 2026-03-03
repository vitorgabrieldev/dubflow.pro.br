<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'user_type' => $this->user_type,
            'user_id' => $this->user_id,
            'user' => $user ? [
                'id' => $user->id,
                'uuid' => $user->uuid ?? null,
                'name' => $user->name ?? null,
                'email' => $user->email ?? null,
            ] : null,
            'message' => $this->message,
            'level' => $this->level,
            'color' => $this->getColor(),
            'context' => $this->context,
            'ip' => $this->ip,
            'user_agent' => $this->user_agent,
            'method' => $this->method,
            'url' => $this->url,
            'created_at' => $this->created_at?->toAtomString(),
            'updated_at' => $this->updated_at?->toAtomString(),
        ];
    }
}
