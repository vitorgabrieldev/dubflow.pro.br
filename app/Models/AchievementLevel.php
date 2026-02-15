<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementLevel extends Model
{
    use HasFactory;

    protected $fillable = [
        'achievement_definition_id',
        'level',
        'threshold',
        'title',
        'description',
        'rarity',
        'icon',
        'color_start',
        'color_end',
        'valid_for_days',
        'display_order',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'threshold' => 'integer',
            'valid_for_days' => 'integer',
            'display_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(AchievementDefinition::class, 'achievement_definition_id');
    }
}
