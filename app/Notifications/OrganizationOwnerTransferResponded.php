<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationOwnerTransferResponded extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $targetUser,
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
        $accepted = $this->status === 'accepted';

        return [
            'type' => 'organization_owner_transfer_responded',
            'title' => 'Resposta da transferência',
            'message' => $this->targetUser->name.' '.($accepted ? 'aceitou' : 'recusou').' a transferência de propriedade de '.$this->organization->name.'.',
            'icon' => $accepted ? 'check-circle-2' : 'x-circle',
            'image' => $this->targetUser->avatar_path,
            'click_action' => '/organizations/'.$this->organization->slug,
            'meta' => [
                'organization_id' => $this->organization->id,
                'organization_slug' => $this->organization->slug,
                'target_user_id' => $this->targetUser->id,
                'status' => $this->status,
            ],
        ];
    }
}

