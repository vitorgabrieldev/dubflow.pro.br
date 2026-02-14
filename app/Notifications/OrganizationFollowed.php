<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationFollowed extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $follower,
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
            'type' => 'organization_followed',
            'title' => 'Novo seguidor',
            'message' => $this->follower->name.' agora acompanha '.$this->organization->name.'.',
            'icon' => 'user-plus',
            'image' => $this->follower->avatar_path,
            'click_action' => '/organizations/'.$this->organization->slug,
            'meta' => [
                'organization_id' => $this->organization->id,
                'follower_user_id' => $this->follower->id,
            ],
        ];
    }
}
