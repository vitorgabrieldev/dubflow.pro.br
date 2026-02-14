<?php

namespace App\Notifications;

use App\Models\DubbingPost;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationPostCommented extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingPost $post,
        private readonly string $commentAuthorName,
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
        $organizationName = $this->post->organization?->name ?? 'Comunidade';

        return [
            'type' => 'organization_post_commented',
            'title' => 'Novo comentário',
            'message' => $this->commentAuthorName.' comentou em "'.$this->post->title.'" na comunidade '.$organizationName.'.',
            'icon' => 'message-circle',
            'image' => $this->post->thumbnail_path,
            'click_action' => '/post/'.$this->post->id,
            'meta' => [
                'post_id' => $this->post->id,
                'organization_id' => $this->post->organization_id,
            ],
        ];
    }
}
