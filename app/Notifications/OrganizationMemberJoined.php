<?php

namespace App\Notifications;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrganizationMemberJoined extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Organization $organization,
        private readonly User $member,
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
            'type' => 'organization_member_joined',
            'title' => 'Novo membro na comunidade',
            'message' => $this->member->name.' entrou em '.$this->organization->name.' como '.$roleLabel.'.',
            'icon' => 'users-round',
            'image' => $this->member->avatar_path,
            'click_action' => '/organizations/'.$this->organization->slug,
            'meta' => [
                'organization_id' => $this->organization->id,
                'organization_slug' => $this->organization->slug,
                'member_user_id' => $this->member->id,
                'role' => $this->role,
            ],
        ];
    }

    private function roleLabel(string $role): string
    {
        return match ($role) {
            'owner' => 'Dono',
            'admin' => 'Colaborador',
            'editor' => 'Dublador',
            default => 'Usuário',
        };
    }
}
