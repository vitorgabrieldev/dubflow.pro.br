<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAchievementProgress extends Model
{
    use HasFactory;

    protected $table = 'user_achievement_progress';

    protected $fillable = [
        'user_id',
        'achievement_definition_id',
        'progress_value',
        'last_event_at',
    ];

    protected function casts(): array
    {
        return [
            'progress_value' => 'integer',
            'last_event_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(AchievementDefinition::class, 'achievement_definition_id');
    }
}
