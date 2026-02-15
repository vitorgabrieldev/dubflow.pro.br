<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementCommentUnique extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'post_id',
        'first_comment_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(DubbingPost::class, 'post_id');
    }

    public function firstComment(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'first_comment_id');
    }
}
