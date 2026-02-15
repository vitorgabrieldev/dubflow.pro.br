<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementPostingDay extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'posted_on',
        'source_post_id',
    ];

    protected function casts(): array
    {
        return [
            'posted_on' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(DubbingPost::class, 'source_post_id');
    }
}
