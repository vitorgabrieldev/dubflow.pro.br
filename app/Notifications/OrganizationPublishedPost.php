<?php

namespace App\Notifications;

use App\Models\DubbingPost;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationPublishedPost extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingPost $post,
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
            'type' => 'organization_published_post',
            'title' => 'Novo episódio publicado',
            'message' => $organizationName.' publicou "'.$this->post->title.'".',
            'icon' => 'clapperboard',
            'image' => $this->post->thumbnail_path,
            'click_action' => '/post/'.$this->post->id,
            'meta' => [
                'post_id' => $this->post->id,
                'organization_id' => $this->post->organization_id,
            ],
        ];
    }
}
