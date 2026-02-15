<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementProcessedEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_key',
        'event_type',
        'resource_id',
        'user_id',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
