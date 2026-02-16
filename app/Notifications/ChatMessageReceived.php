<?php

namespace App\Notifications;

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ChatMessageReceived extends Notification
{
    use Queueable;

    public function __construct(
        private readonly ChatConversation $conversation,
        private readonly ChatMessage $message,
        private readonly User $sender,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $senderName = $this->sender->stage_name ?: $this->sender->name;

        $bodyPreview = trim((string) ($this->message->body ?? ''));
        if ($bodyPreview !== '') {
            $bodyPreview = mb_substr($bodyPreview, 0, 110);
        } else {
            $bodyPreview = 'Você recebeu um anexo no chat.';
        }

        return [
            'type' => 'chat_message_received',
            'title' => 'Nova mensagem',
            'message' => $senderName.': '.$bodyPreview,
            'icon' => 'message-circle',
            'image' => $this->sender->avatar_path,
            'click_action' => '/mensagens?c='.$this->conversation->id,
            'meta' => [
                'conversation_id' => $this->conversation->id,
                'message_id' => $this->message->id,
                'sender_user_id' => $this->sender->id,
            ],
        ];
    }
}
