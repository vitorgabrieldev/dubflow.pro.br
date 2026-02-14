<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostView extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'user_id',
        'session_fingerprint',
        'watch_seconds',
    ];

    protected function casts(): array
    {
        return [
            'watch_seconds' => 'integer',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(DubbingPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
