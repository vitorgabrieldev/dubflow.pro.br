<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AchievementDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'description',
        'category',
        'metric_key',
        'rarity',
        'icon',
        'color_start',
        'color_end',
        'display_order',
        'valid_for_days',
        'is_active',
        'is_hidden',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'valid_for_days' => 'integer',
            'is_active' => 'boolean',
            'is_hidden' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function levels(): HasMany
    {
        return $this->hasMany(AchievementLevel::class)->orderBy('level');
    }

    public function progresses(): HasMany
    {
        return $this->hasMany(UserAchievementProgress::class);
    }

    public function unlockedUsers(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }
}
