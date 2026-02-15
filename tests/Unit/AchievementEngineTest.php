<?php

namespace Tests\Unit;

use App\Models\AchievementDefinition;
use App\Models\AchievementLevel;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserAchievementProgress;
use App\Notifications\AchievementUnlocked;
use App\Support\AchievementEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AchievementEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_unlock_sets_expiration_and_marks_notified_at_after_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $post = $this->createPublishedPost($user, 'Engine Expiration Post');

        $definition = AchievementDefinition::query()->create([
            'slug' => 'engine-expiration',
            'title' => 'Engine Expiration',
            'description' => 'Teste de expiração.',
            'category' => 'episodios',
            'metric_key' => 'episodes_launched_total',
            'rarity' => 'rare',
            'icon' => 'clapperboard',
            'color_start' => '#38BDF8',
            'color_end' => '#60A5FA',
            'display_order' => 1,
            'valid_for_days' => null,
            'is_active' => true,
            'is_hidden' => false,
        ]);

        AchievementLevel::query()->create([
            'achievement_definition_id' => $definition->id,
            'level' => 1,
            'threshold' => 1,
            'title' => 'Nível 1',
            'description' => 'Primeiro nível.',
            'rarity' => 'rare',
            'icon' => 'clapperboard',
            'color_start' => '#38BDF8',
            'color_end' => '#60A5FA',
            'valid_for_days' => 7,
            'display_order' => 1,
        ]);

        app(AchievementEngine::class)->onEpisodePublished($post);

        $unlocked = UserAchievement::query()->first();
        $this->assertNotNull($unlocked);
        $this->assertNotNull($unlocked?->expires_at);
        $this->assertNotNull($unlocked?->notified_at);

        Notification::assertSentTo($user, AchievementUnlocked::class);
    }

    public function test_episode_publication_event_is_idempotent_by_post(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $post = $this->createPublishedPost($user, 'Engine Idempotent Post');

        $definition = AchievementDefinition::query()->create([
            'slug' => 'engine-idempotent-guard',
            'title' => 'Engine Idempotent Guard',
            'description' => 'Evita duplicidade por evento de publicação.',
            'category' => 'episodios',
            'metric_key' => 'episodes_launched_total',
            'rarity' => 'common',
            'icon' => 'clapperboard',
            'color_start' => '#94A3B8',
            'color_end' => '#CBD5E1',
            'display_order' => 1,
            'valid_for_days' => null,
            'is_active' => true,
            'is_hidden' => false,
        ]);

        AchievementLevel::query()->create([
            'achievement_definition_id' => $definition->id,
            'level' => 1,
            'threshold' => 1,
            'title' => 'Nível 1',
            'description' => 'Primeiro nível.',
            'rarity' => 'common',
            'icon' => 'clapperboard',
            'color_start' => '#94A3B8',
            'color_end' => '#CBD5E1',
            'valid_for_days' => null,
            'display_order' => 1,
        ]);

        $engine = app(AchievementEngine::class);
        $engine->onEpisodePublished($post);
        $engine->onEpisodePublished($post);

        $this->assertDatabaseCount('user_achievements', 1);

        $progress = UserAchievementProgress::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($progress);
        $this->assertSame(1, (int) ($progress?->progress_value ?? 0));
        $this->assertDatabaseCount('achievement_processed_events', 1);
    }

    private function createPublishedPost(User $author, string $title): DubbingPost
    {
        $organization = Organization::query()->create([
            'owner_user_id' => $author->id,
            'name' => 'Org '.uniqid(),
            'slug' => 'org-'.uniqid(),
            'is_public' => true,
        ]);

        return DubbingPost::query()->create([
            'organization_id' => $organization->id,
            'author_user_id' => $author->id,
            'title' => $title,
            'description' => 'Post para unit test',
            'media_path' => 'dubbing-media/unit.mp3',
            'media_type' => 'audio',
            'duration_seconds' => 120,
            'visibility' => 'public',
            'allow_comments' => true,
            'language_code' => 'pt-BR',
            'content_license' => 'all_rights_reserved',
            'published_at' => now(),
        ]);
    }
}
