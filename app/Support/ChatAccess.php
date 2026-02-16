<?php

namespace App\Support;

use App\Models\ChatUserBlock;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class ChatAccess
{
    private static ?bool $chatTablesReady = null;

    /**
     * @return array{allowed: bool, reason: string|null}
     */
    public static function canSendMessage(User $sender, User $recipient): array
    {
        if (! self::isChatReady()) {
            return [
                'allowed' => false,
                'reason' => 'Chat indisponível no momento.',
            ];
        }

        if ($sender->id === $recipient->id) {
            return [
                'allowed' => false,
                'reason' => 'Você não pode enviar mensagem para a própria conta.',
            ];
        }

        if (self::isBlockedBy($sender->id, $recipient->id)) {
            return [
                'allowed' => false,
                'reason' => 'Você bloqueou este usuário no chat.',
            ];
        }

        if ($recipient->is_private) {
            $isFollowing = $sender->followingUsers()
                ->where('users.id', $recipient->id)
                ->exists();

            if (! $isFollowing) {
                return [
                    'allowed' => false,
                    'reason' => 'Perfil privado: você precisa seguir este usuário para enviar mensagem.',
                ];
            }
        }

        return [
            'allowed' => true,
            'reason' => null,
        ];
    }

    public static function isBlockedBetween(int $firstUserId, int $secondUserId): bool
    {
        if (! self::isChatReady()) {
            return false;
        }

        return ChatUserBlock::query()
            ->where(function ($query) use ($firstUserId, $secondUserId): void {
                $query->where('blocker_user_id', $firstUserId)
                    ->where('blocked_user_id', $secondUserId);
            })
            ->orWhere(function ($query) use ($firstUserId, $secondUserId): void {
                $query->where('blocker_user_id', $secondUserId)
                    ->where('blocked_user_id', $firstUserId);
            })
            ->exists();
    }

    public static function isBlockedBy(int $blockerUserId, int $blockedUserId): bool
    {
        if (! self::isChatReady()) {
            return false;
        }

        return ChatUserBlock::query()
            ->where('blocker_user_id', $blockerUserId)
            ->where('blocked_user_id', $blockedUserId)
            ->exists();
    }

    private static function isChatReady(): bool
    {
        if (self::$chatTablesReady !== null) {
            return self::$chatTablesReady;
        }

        self::$chatTablesReady = Schema::hasTable('chat_user_blocks')
            && Schema::hasTable('chat_conversations')
            && Schema::hasTable('chat_messages')
            && Schema::hasTable('chat_conversation_participants');

        return self::$chatTablesReady;
    }
}
