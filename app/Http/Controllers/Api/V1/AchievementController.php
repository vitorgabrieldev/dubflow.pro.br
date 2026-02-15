<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AchievementDefinition;
use App\Models\AchievementFeedItem;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserAchievementProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    public function mine(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        $activeAt = now();

        $definitions = AchievementDefinition::query()
            ->where('is_active', true)
            ->with('levels')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $totalUsers = max(1, User::query()->count());

        $progressMap = UserAchievementProgress::query()
            ->where('user_id', $user->id)
            ->pluck('progress_value', 'achievement_definition_id');

        $unlockedRows = UserAchievement::query()
            ->where('user_id', $user->id)
            ->where(function ($query) use ($activeAt): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>=', $activeAt);
            })
            ->orderByDesc('level')
            ->get()
            ->groupBy('achievement_definition_id');

        $holdersByDefinition = UserAchievement::query()
            ->selectRaw('achievement_definition_id, COUNT(DISTINCT user_id) as holders_count')
            ->where(function ($query) use ($activeAt): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>=', $activeAt);
            })
            ->groupBy('achievement_definition_id')
            ->pluck('holders_count', 'achievement_definition_id');

        $holdersByLevel = UserAchievement::query()
            ->selectRaw('achievement_definition_id, level, COUNT(DISTINCT user_id) as holders_count')
            ->where(function ($query) use ($activeAt): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>=', $activeAt);
            })
            ->groupBy('achievement_definition_id', 'level')
            ->get()
            ->groupBy('achievement_definition_id');

        $items = $definitions->map(function (AchievementDefinition $definition) use ($progressMap, $unlockedRows, $holdersByDefinition, $holdersByLevel, $totalUsers) {
            $levels = $definition->levels->sortBy('level')->values();
            $userDefinitionUnlocks = $unlockedRows->get($definition->id) ?? collect();
            $highestUnlocked = $userDefinitionUnlocks->first();
            $progressValue = (int) ($progressMap[$definition->id] ?? 0);

            $nextLevel = $levels->first(function ($level) use ($highestUnlocked) {
                if (! $highestUnlocked) {
                    return true;
                }

                return (int) $level->level > (int) $highestUnlocked->level;
            });

            $holdersCount = (int) ($holdersByDefinition[$definition->id] ?? 0);
            $holdersPercentage = round(($holdersCount / $totalUsers) * 100, 2);

            return [
                'id' => $definition->id,
                'slug' => $definition->slug,
                'title' => $definition->title,
                'description' => $definition->description,
                'category' => $definition->category,
                'metric_key' => $definition->metric_key,
                'rarity' => $definition->rarity,
                'icon' => $definition->icon,
                'color_start' => $definition->color_start,
                'color_end' => $definition->color_end,
                'is_hidden' => (bool) $definition->is_hidden,
                'progress' => [
                    'value' => $progressValue,
                    'next_threshold' => $nextLevel?->threshold,
                    'remaining_to_next' => $nextLevel ? max(0, (int) $nextLevel->threshold - $progressValue) : 0,
                ],
                'user_status' => [
                    'is_unlocked' => $highestUnlocked !== null,
                    'highest_level' => $highestUnlocked ? (int) $highestUnlocked->level : 0,
                    'unlocked_at' => $highestUnlocked?->unlocked_at?->toIso8601String(),
                    'expires_at' => $highestUnlocked?->expires_at?->toIso8601String(),
                ],
                'stats' => [
                    'holders_count' => $holdersCount,
                    'holders_percentage' => $holdersPercentage,
                ],
                'levels' => $levels->map(function ($level) use ($userDefinitionUnlocks, $holdersByLevel, $definition, $totalUsers) {
                    $isUnlocked = $userDefinitionUnlocks->contains(fn ($row) => (int) $row->level === (int) $level->level);
                    $levelGroup = $holdersByLevel->get($definition->id) ?? collect();
                    $holdersForLevel = (int) ($levelGroup->firstWhere('level', $level->level)?->holders_count ?? 0);

                    return [
                        'id' => $level->id,
                        'level' => (int) $level->level,
                        'threshold' => (int) $level->threshold,
                        'title' => $level->title,
                        'description' => $level->description,
                        'rarity' => $level->rarity,
                        'icon' => $level->icon,
                        'color_start' => $level->color_start,
                        'color_end' => $level->color_end,
                        'valid_for_days' => $level->valid_for_days,
                        'is_unlocked' => $isUnlocked,
                        'holders_count' => $holdersForLevel,
                        'holders_percentage' => round(($holdersForLevel / $totalUsers) * 100, 2),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'summary' => [
                'total_achievements' => $items->count(),
                'unlocked_achievements' => $items->where('user_status.is_unlocked', true)->count(),
                'total_users' => $totalUsers,
            ],
            'items' => $items,
        ]);
    }

    public function feed(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $feed = AchievementFeedItem::query()
            ->where('user_id', $user->id)
            ->with([
                'definition:id,slug,title,description,category,rarity,icon,color_start,color_end',
                'levelDefinition:id,achievement_definition_id,level,threshold,title,description,rarity,icon,color_start,color_end',
            ])
            ->latest('unlocked_at')
            ->paginate((int) $request->integer('per_page', 20));

        return response()->json($feed);
    }
}
