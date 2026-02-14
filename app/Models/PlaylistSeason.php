<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlaylistSeason extends Model
{
    use HasFactory;

    protected $fillable = [
        'playlist_id',
        'season_number',
        'title',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'season_number' => 'integer',
        ];
    }

    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(DubbingPost::class, 'season_id');
    }
}
