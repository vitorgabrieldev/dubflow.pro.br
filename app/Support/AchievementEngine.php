<?php

namespace App\Support;

use App\Models\AchievementCommentUnique;
use App\Models\AchievementDefinition;
use App\Models\AchievementFeedItem;
use App\Models\AchievementLevel;
use App\Models\AchievementPostingDay;
use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\DubbingTest;
use App\Models\DubbingTestSubmission;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserAchievementProgress;
use App\Notifications\AchievementUnlocked;
use Carbon\CarbonInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class AchievementEngine
{
    public function onEpisodePublished(DubbingPost $post): void
    {
        $authorId = (int) ($post->author_user_id ?? 0);
        if ($authorId <= 0 || $post->published_at === null) {
            return;
        }

        $eventTime = $post->published_at instanceof CarbonInterface ? $post->published_at : now();

        $this->incrementMetric($authorId, 'episodes_launched_total', 1, $eventTime);
        $this->trackPostingConsistency($authorId, $post, $eventTime);
    }

    public function onPostLiked(DubbingPost $post, int $likerUserId, bool $created): void
    {
        if (! $created) {
            return;
        }

        $authorId = (int) ($post->author_user_id ?? 0);
        if ($authorId <= 0 || $authorId === $likerUserId) {
            return;
        }

        $this->incrementMetric($authorId, 'episode_likes_received_total', 1, now());
    }

    public function onCommentCreated(Comment $comment): void
    {
        $userId = (int) ($comment->user_id ?? 0);
        $postId = (int) ($comment->post_id ?? 0);

        if ($userId <= 0 || $postId <= 0) {
            return;
        }

        $isUniqueComment = $this->storeUniqueComment($userId, $postId, (int) $comment->id);
        if (! $isUniqueComment) {
            return;
        }

        $this->incrementMetric($userId, 'episode_comments_unique_total', 1, now());
    }

    public function onDubbingTestCreated(DubbingTest $dubbingTest): void
    {
        $creatorId = (int) ($dubbingTest->created_by_user_id ?? 0);
        if ($creatorId <= 0) {
            return;
        }

        $this->incrementMetric($creatorId, 'tests_created_total', 1, now());
    }

    public function onDubbingTestSubmitted(DubbingTestSubmission $submission): void
    {
        $userId = (int) ($submission->user_id ?? 0);
        if ($userId <= 0) {
            return;
        }

        $this->incrementMetric($userId, 'role_submissions_total', 1, now());
    }

    private function trackPostingConsistency(int $userId, DubbingPost $post, CarbonInterface $eventTime): void
    {
        try {
            AchievementPostingDay::query()->firstOrCreate([
                'user_id' => $userId,
                'posted_on' => $eventTime->toDateString(),
            ], [
                'source_post_id' => $post->id,
            ]);
        } catch (Throwable $exception) {
            if (! $this->isUniqueConstraintViolation($exception)) {
                throw $exception;
            }
        }

        $windowStart = now()->subDays(29)->toDateString();

        $daysCount = AchievementPostingDay::query()
            ->where('user_id', $userId)
            ->where('posted_on', '>=', $windowStart)
            ->count();

        $this->setMetric($userId, 'posting_days_30d', $daysCount, $eventTime);
    }

    private function storeUniqueComment(int $userId, int $postId, int $commentId): bool
    {
        try {
            AchievementCommentUnique::query()->create([
                'user_id' => $userId,
                'post_id' => $postId,
                'first_comment_id' => $commentId,
            ]);

            return true;
        } catch (Throwable $exception) {
            if ($this->isUniqueConstraintViolation($exception)) {
                return false;
            }

            throw $exception;
        }
    }

    private function incrementMetric(int $userId, string $metricKey, int $incrementBy, CarbonInterface $eventTime): void
    {
        if ($incrementBy <= 0) {
            return;
        }

        $definitions = $this->definitionsForMetric($metricKey);
        if ($definitions->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($definitions, $userId, $incrementBy, $eventTime): void {
            foreach ($definitions as $definition) {
                $progress = UserAchievementProgress::query()
                    ->where('user_id', $userId)
                    ->where('achievement_definition_id', $definition->id)
                    ->lockForUpdate()
                    ->first();

                $nextValue = (int) ($progress?->progress_value ?? 0) + $incrementBy;

                if ($progress) {
                    $progress->progress_value = $nextValue;
                    $progress->last_event_at = $eventTime;
                    $progress->save();
                } else {
                    UserAchievementProgress::query()->create([
                        'user_id' => $userId,
                        'achievement_definition_id' => $definition->id,
                        'progress_value' => $nextValue,
                        'last_event_at' => $eventTime,
                    ]);
                }

                $this->unlockEligibleLevels($userId, $definition, $nextValue, $eventTime);
            }
        });
    }

    private function setMetric(int $userId, string $metricKey, int $value, CarbonInterface $eventTime): void
    {
        $definitions = $this->definitionsForMetric($metricKey);
        if ($definitions->isEmpty()) {
            return;
        }

        $normalizedValue = max(0, $value);

        DB::transaction(function () use ($definitions, $userId, $normalizedValue, $eventTime): void {
            foreach ($definitions as $definition) {
                $progress = UserAchievementProgress::query()
                    ->where('user_id', $userId)
                    ->where('achievement_definition_id', $definition->id)
                    ->lockForUpdate()
                    ->first();

                if ($progress) {
                    $progress->progress_value = $normalizedValue;
                    $progress->last_event_at = $eventTime;
                    $progress->save();
                } else {
                    UserAchievementProgress::query()->create([
                        'user_id' => $userId,
                        'achievement_definition_id' => $definition->id,
                        'progress_value' => $normalizedValue,
                        'last_event_at' => $eventTime,
                    ]);
                }

                $this->unlockEligibleLevels($userId, $definition, $normalizedValue, $eventTime);
            }
        });
    }

    private function unlockEligibleLevels(int $userId, AchievementDefinition $definition, int $currentValue, CarbonInterface $eventTime): void
    {
        if ($currentValue <= 0) {
            return;
        }

        /** @var Collection<int, AchievementLevel> $eligibleLevels */
        $eligibleLevels = $definition->levels
            ->filter(fn (AchievementLevel $level) => (int) $level->threshold <= $currentValue)
            ->sortBy('level')
            ->values();

        if ($eligibleLevels->isEmpty()) {
            return;
        }

        $alreadyUnlockedLevels = UserAchievement::query()
            ->where('user_id', $userId)
            ->where('achievement_definition_id', $definition->id)
            ->pluck('level')
            ->map(static fn ($level): int => (int) $level)
            ->all();

        $user = User::query()->find($userId);

        foreach ($eligibleLevels as $level) {
            if (in_array((int) $level->level, $alreadyUnlockedLevels, true)) {
                continue;
            }

            $expiresAt = $this->resolveExpiration($level, $definition, $eventTime);

            $userAchievement = UserAchievement::query()->create([
                'user_id' => $userId,
                'achievement_definition_id' => $definition->id,
                'achievement_level_id' => $level->id,
                'level' => $level->level,
                'progress_value_at_unlock' => $currentValue,
                'unlocked_at' => $eventTime,
                'expires_at' => $expiresAt,
                'notified_at' => $user ? now() : null,
            ]);

            AchievementFeedItem::query()->create([
                'user_id' => $userId,
                'user_achievement_id' => $userAchievement->id,
                'achievement_definition_id' => $definition->id,
                'achievement_level_id' => $level->id,
                'level' => $level->level,
                'unlocked_at' => $eventTime,
            ]);

            AuditTrail::record(
                'achievement_unlocked',
                $userAchievement,
                $userId,
                null,
                null,
                $userAchievement->toArray(),
                [
                    'achievement_slug' => $definition->slug,
                    'achievement_level' => (int) $level->level,
                    'metric_key' => $definition->metric_key,
                ],
                null,
            );

            if ($user) {
                $userAchievement->setRelation('definition', $definition);
                $userAchievement->setRelation('levelDefinition', $level);
                $user->notify(new AchievementUnlocked($userAchievement));
            }
        }
    }

    private function resolveExpiration(AchievementLevel $level, AchievementDefinition $definition, CarbonInterface $eventTime): ?CarbonInterface
    {
        $validForDays = (int) ($level->valid_for_days ?? $definition->valid_for_days ?? 0);

        if ($validForDays <= 0) {
            return null;
        }

        return $eventTime->copy()->addDays($validForDays);
    }

    /**
     * @return Collection<int, AchievementDefinition>
     */
    private function definitionsForMetric(string $metricKey): Collection
    {
        return AchievementDefinition::query()
            ->where('metric_key', $metricKey)
            ->where('is_active', true)
            ->with('levels')
            ->orderBy('display_order')
            ->get();
    }

    private function isUniqueConstraintViolation(Throwable $exception): bool
    {
        if ($exception instanceof QueryException) {
            $sqlState = $exception->errorInfo[0] ?? null;
            if (in_array($sqlState, ['23000', '23505'], true)) {
                return true;
            }
        }

        $message = mb_strtolower($exception->getMessage());

        return str_contains($message, 'unique constraint')
            || str_contains($message, 'duplicate entry')
            || str_contains($message, 'integrity constraint violation');
    }
}
