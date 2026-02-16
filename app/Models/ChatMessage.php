<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_user_id',
        'recipient_user_id',
        'body',
        'edited_at',
        'deleted_at',
        'delivered_at',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
            'deleted_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ChatMessageAttachment::class, 'message_id');
    }

    public function statusForViewer(int $viewerId): string
    {
        $isSender = $viewerId === (int) $this->sender_user_id;

        if ($isSender) {
            if ($this->read_at !== null) {
                return 'received_read';
            }

            if ($this->delivered_at !== null) {
                return 'received_unread';
            }

            return 'sent_not_received';
        }

        if ($this->read_at !== null) {
            return 'read';
        }

        if ($this->delivered_at !== null) {
            return 'received_unread';
        }

        return 'not_received';
    }
}
