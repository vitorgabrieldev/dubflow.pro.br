<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DubbingPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'playlist_id',
        'season_id',
        'author_user_id',
        'title',
        'description',
        'media_path',
        'media_type',
        'media_size_bytes',
        'thumbnail_path',
        'duration_seconds',
        'visibility',
        'allow_comments',
        'language_code',
        'content_license',
        'published_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'media_size_bytes' => 'integer',
            'duration_seconds' => 'integer',
            'allow_comments' => 'boolean',
            'published_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(PlaylistSeason::class, 'season_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    public function collaborators(): HasMany
    {
        return $this->hasMany(PostCollaborator::class, 'post_id');
    }

    public function credits(): HasMany
    {
        return $this->hasMany(PostCredit::class, 'post_id')->orderBy('display_order');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class, 'post_id');
    }

    public function comments(): HasMany
    {
        // Apenas comentários raiz (respostas ficam em Comment::replies).
        return $this->hasMany(Comment::class, 'post_id')
            ->whereNull('parent_id')
            ->latest();
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'dubbing_post_tag', 'post_id', 'tag_id')->withTimestamps();
    }

    public function views(): HasMany
    {
        return $this->hasMany(PostView::class, 'post_id');
    }
}
