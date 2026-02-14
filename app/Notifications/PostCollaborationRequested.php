<?php

namespace App\Notifications;

use App\Models\DubbingPost;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PostCollaborationRequested extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingPost $post,
        private readonly User $inviter,
    ) {
    }

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
        return [
            'type' => 'post_collaboration_requested',
            'title' => 'Novo convite de colaboracao',
            'message' => $this->inviter->name.' convidou voce para colaborar em "'.$this->post->title.'".',
            'icon' => 'users-round',
            'image' => $this->post->thumbnail_path,
            'click_action' => '/posts/'.$this->post->id,
            'meta' => [
                'post_id' => $this->post->id,
                'organization_id' => $this->post->organization_id,
                'inviter_user_id' => $this->inviter->id,
            ],
        ];
    }
}
