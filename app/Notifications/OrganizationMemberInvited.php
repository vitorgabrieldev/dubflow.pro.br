<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationMemberInvited extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $inviter,
        private readonly string $role,
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
        $roleLabel = $this->roleLabel($this->role);

        return [
            'type' => 'organization_member_invited',
            'title' => 'Convite para comunidade',
            'message' => $this->inviter->name.' convidou você para '.$this->organization->name.' como '.$roleLabel.'.',
            'icon' => 'users-round',
            'image' => $this->organization->avatar_path,
            'click_action' => null,
            'organization_slug' => $this->organization->slug,
            'role' => $this->role,
            'meta' => [
                'organization_id' => $this->organization->id,
                'organization_slug' => $this->organization->slug,
                'inviter_user_id' => $this->inviter->id,
                'inviter_name' => $this->inviter->name,
                'role' => $this->role,
            ],
        ];
    }

    private function roleLabel(string $role): string
    {
        return match ($role) {
            'admin' => 'Colaborador',
            'editor' => 'Dublador',
            default => 'Usuário',
        };
    }
}
