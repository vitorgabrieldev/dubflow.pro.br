<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'character_name',
        'dubber_user_id',
        'dubber_name',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(DubbingPost::class, 'post_id');
    }

    public function dubber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dubber_user_id');
    }
}
