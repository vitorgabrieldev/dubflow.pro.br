<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationMemberInviteResponded extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $member,
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
        $action = $accepted ? 'aceitou' : 'recusou';

        return [
            'type' => 'organization_member_invite_responded',
            'title' => 'Resposta de convite',
            'message' => $this->member->name.' '.$action.' o convite para '.$this->organization->name.'.',
            'icon' => $accepted ? 'check-circle-2' : 'x-circle',
            'image' => $this->member->avatar_path,
            'click_action' => '/organizations/'.$this->organization->slug,
            'meta' => [
                'organization_id' => $this->organization->id,
                'organization_slug' => $this->organization->slug,
                'member_user_id' => $this->member->id,
                'status' => $this->status,
            ],
        ];
    }
}
