<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\OrganizationOwnerTransfer;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationOwnerTransferRequested extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $currentOwner,
        private readonly OrganizationOwnerTransfer $transfer,
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
            'type' => 'organization_owner_transfer_requested',
            'title' => 'Transferência de propriedade',
            'message' => $this->currentOwner->name.' solicitou transferir a comunidade '.$this->organization->name.' para você.',
            'icon' => 'users-round',
            'image' => $this->organization->avatar_path,
            'click_action' => null,
            'organization_slug' => $this->organization->slug,
            'transfer_status' => 'pending',
            'meta' => [
                'organization_id' => $this->organization->id,
                'organization_slug' => $this->organization->slug,
                'transfer_id' => $this->transfer->id,
                'current_owner_user_id' => $this->currentOwner->id,
                'transfer_status' => 'pending',
            ],
        ];
    }
}

