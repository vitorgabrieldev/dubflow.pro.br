<?php

namespace App\Notifications;

use App\Models\DubbingPost;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PostCollaborationResponded extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingPost $post,
        private readonly User $collaborator,
        private readonly string $status,
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
        $action = $this->status === 'accepted' ? 'aceitou' : 'recusou';

        return [
            'type' => 'post_collaboration_responded',
            'title' => 'Resposta de colaboracao',
            'message' => $this->collaborator->name.' '.$action.' o convite em "'.$this->post->title.'".',
            'icon' => $this->status === 'accepted' ? 'check-circle-2' : 'x-circle',
            'image' => $this->post->thumbnail_path,
            'click_action' => '/posts/'.$this->post->id,
            'meta' => [
                'post_id' => $this->post->id,
                'organization_id' => $this->post->organization_id,
                'collaborator_user_id' => $this->collaborator->id,
                'status' => $this->status,
            ],
        ];
    }
}
