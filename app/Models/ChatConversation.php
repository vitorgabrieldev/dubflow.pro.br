<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatConversation extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_id',
    ];

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'last_message_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ChatConversationParticipant::class, 'conversation_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id');
    }

    /**
     * @return array{0: int, 1: int}
     */
    public static function canonicalPair(int $firstUserId, int $secondUserId): array
    {
        return $firstUserId < $secondUserId
            ? [$firstUserId, $secondUserId]
            : [$secondUserId, $firstUserId];
    }

    public function peerUserId(int $viewerId): ?int
    {
        if ($this->user_one_id === $viewerId) {
            return $this->user_two_id;
        }

        if ($this->user_two_id === $viewerId) {
            return $this->user_one_id;
        }

        return null;
    }
}
