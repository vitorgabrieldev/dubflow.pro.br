<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementFeedItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_achievement_id',
        'achievement_definition_id',
        'achievement_level_id',
        'level',
        'unlocked_at',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'unlocked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAchievement(): BelongsTo
    {
        return $this->belongsTo(UserAchievement::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(AchievementDefinition::class, 'achievement_definition_id');
    }

    public function levelDefinition(): BelongsTo
    {
        return $this->belongsTo(AchievementLevel::class, 'achievement_level_id');
    }
}
