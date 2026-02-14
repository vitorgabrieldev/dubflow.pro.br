<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_user_id',
        'name',
        'slug',
        'description',
        'avatar_path',
        'cover_path',
        'website_url',
        'is_public',
        'is_verified',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'is_verified' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_members')
            ->withPivot(['role', 'status', 'joined_at'])
            ->withTimestamps();
    }

    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(DubbingPost::class);
    }

    public function follows(): HasMany
    {
        return $this->hasMany(OrganizationFollow::class);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_follows')->withTimestamps();
    }

    public function recalculateVerification(): void
    {
        $playlistCount = $this->playlists()->count();
        $postCount = $this->posts()->count();
        $followersCount = $this->followers()->count();

        $profileCompleted = !empty($this->description) && !empty($this->avatar_path) && !empty($this->cover_path);

        $this->is_verified = $playlistCount >= 10
            && $postCount >= 40
            && $followersCount >= 50
            && $profileCompleted;

        $this->save();
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
