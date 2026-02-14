<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Playlist extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'title',
        'slug',
        'description',
        'work_title',
        'season_number',
        'release_year',
        'cover_path',
        'visibility',
    ];

    protected function casts(): array
    {
        return [
            'season_number' => 'integer',
            'release_year' => 'integer',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(DubbingPost::class);
    }

    public function seasons(): HasMany
    {
        return $this->hasMany(PlaylistSeason::class)->orderBy('season_number');
    }
}
