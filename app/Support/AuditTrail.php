<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditTrail
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @param  array<string, mixed>|null  $meta
     */
    public static function record(
        string $action,
        Model $auditable,
        ?int $actorUserId = null,
        ?int $organizationId = null,
        ?array $before = null,
        ?array $after = null,
        ?array $meta = null,
        ?Request $request = null,
    ): void {
        AuditLog::create([
            'actor_user_id' => $actorUserId,
            'action' => $action,
            'auditable_type' => $auditable::class,
            'auditable_id' => $auditable->getKey(),
            'organization_id' => $organizationId,
            'before_json' => $before,
            'after_json' => $after,
            'meta_json' => $meta,
            'ip' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'created_at' => now(),
        ]);
    }
}
