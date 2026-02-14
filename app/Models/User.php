<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory;
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'stage_name',
        'bio',
        'avatar_path',
        'cover_path',
        'website_url',
        'skills',
        'social_links',
        'profile_links',
        'tags',
        'dubbing_history',
        'locale',
        'is_private',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_private' => 'boolean',
            'skills' => 'array',
            'social_links' => 'array',
            'profile_links' => 'array',
            'tags' => 'array',
            'password' => 'hashed',
        ];
    }

    public function organizationsOwned(): HasMany
    {
        return $this->hasMany(Organization::class, 'owner_user_id');
    }

    public function organizationMemberships(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_members')
            ->withPivot(['role', 'status', 'joined_at'])
            ->withTimestamps();
    }

    public function followedOrganizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_follows')->withTimestamps();
    }

    public function authoredPosts(): HasMany
    {
        return $this->hasMany(DubbingPost::class, 'author_user_id');
    }

    public function collaborations(): HasMany
    {
        return $this->hasMany(PostCollaborator::class);
    }

    public function postLikes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function views(): HasMany
    {
        return $this->hasMany(PostView::class);
    }

    public function organizationInvitesCreated(): HasMany
    {
        return $this->hasMany(OrganizationInvite::class, 'created_by_user_id');
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /**
     * @return array<string, mixed>
     */
    public function getJWTCustomClaims(): array
    {
        return [];
    }
}
