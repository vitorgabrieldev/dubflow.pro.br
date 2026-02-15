<?php

namespace App\Notifications;

use App\Models\AchievementDefinition;
use App\Models\AchievementLevel;
use App\Models\UserAchievement;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class AchievementUnlocked extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly UserAchievement $userAchievement,
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
        /** @var AchievementDefinition|null $definition */
        $definition = $this->userAchievement->relationLoaded('definition')
            ? $this->userAchievement->definition
            : $this->userAchievement->definition()->first();

        /** @var AchievementLevel|null $level */
        $level = $this->userAchievement->relationLoaded('levelDefinition')
            ? $this->userAchievement->levelDefinition
            : $this->userAchievement->levelDefinition()->first();

        $levelLabel = 'Nível '.(int) ($this->userAchievement->level ?? 1);
        $title = trim((string) ($level?->title ?: $definition?->title ?: 'Nova conquista'));

        return [
            'type' => 'achievement_unlocked',
            'title' => 'Conquista desbloqueada',
            'message' => $title.' • '.$levelLabel,
            'icon' => 'trophy',
            'image' => null,
            'click_action' => '/perfil',
            'meta' => [
                'achievement_slug' => $definition?->slug,
                'achievement_title' => $definition?->title,
                'level' => (int) ($this->userAchievement->level ?? 1),
                'rarity' => $level?->rarity ?? $definition?->rarity,
                'unlocked_at' => optional($this->userAchievement->unlocked_at)->toIso8601String(),
            ],
        ];
    }
}
