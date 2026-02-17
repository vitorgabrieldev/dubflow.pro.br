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
        'pronouns',
        'bio',
        'avatar_path',
        'cover_path',
        'website_url',
        'skills',
        'dubbing_languages',
        'voice_accents',
        'has_recording_equipment',
        'recording_equipment',
        'recording_equipment_other',
        'weekly_availability',
        'state',
        'city',
        'proposal_contact_preferences',
        'proposal_contact_links',
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
            'token_version' => 'integer',
            'skills' => 'array',
            'dubbing_languages' => 'array',
            'voice_accents' => 'array',
            'has_recording_equipment' => 'boolean',
            'recording_equipment' => 'array',
            'weekly_availability' => 'array',
            'proposal_contact_preferences' => 'array',
            'proposal_contact_links' => 'array',
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

    public function followingUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_follows', 'follower_user_id', 'followed_user_id')->withTimestamps();
    }

    public function followerUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_follows', 'followed_user_id', 'follower_user_id')->withTimestamps();
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

    public function createdDubbingTests(): HasMany
    {
        return $this->hasMany(DubbingTest::class, 'created_by_user_id');
    }

    public function dubbingTestSubmissions(): HasMany
    {
        return $this->hasMany(DubbingTestSubmission::class);
    }

    public function achievementProgress(): HasMany
    {
        return $this->hasMany(UserAchievementProgress::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }

    public function achievementFeedItems(): HasMany
    {
        return $this->hasMany(AchievementFeedItem::class);
    }

    public function chatConversationsAsUserOne(): HasMany
    {
        return $this->hasMany(ChatConversation::class, 'user_one_id');
    }

    public function chatConversationsAsUserTwo(): HasMany
    {
        return $this->hasMany(ChatConversation::class, 'user_two_id');
    }

    public function chatConversationParticipants(): HasMany
    {
        return $this->hasMany(ChatConversationParticipant::class, 'user_id');
    }

    public function sentChatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'sender_user_id');
    }

    public function receivedChatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'recipient_user_id');
    }

    public function blockedChatUsers(): HasMany
    {
        return $this->hasMany(ChatUserBlock::class, 'blocker_user_id');
    }

    public function chatBlockedByUsers(): HasMany
    {
        return $this->hasMany(ChatUserBlock::class, 'blocked_user_id');
    }

    public function editorProjects(): HasMany
    {
        return $this->hasMany(EditorProject::class, 'owner_user_id');
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
        return [
            'token_version' => (int) ($this->token_version ?? 0),
        ];
    }
}
