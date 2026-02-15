<?php

namespace Tests\Feature;

use App\Models\AchievementDefinition;
use App\Models\DubbingTest;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Database\Seeders\AchievementCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AchievementApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AchievementCatalogSeeder::class);
    }

    public function test_user_can_fetch_achievement_catalog_with_all_locked_initially(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/achievements/me')
            ->assertOk();

        $response
            ->assertJsonPath('summary.total_achievements', 30)
            ->assertJsonPath('summary.unlocked_achievements', 0)
            ->assertJsonCount(30, 'items');

        $this->assertTrue(
            collect($response->json('items'))->every(fn ($item) => ($item['user_status']['is_unlocked'] ?? false) === false)
        );
    }

    public function test_episode_publication_and_like_unlock_achievements_for_author(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $liker = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'achievements-like-org', 'Achievements Like Org');

        $postResponse = $this->withHeaders($this->authHeaders($owner))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', [
                'title' => 'Episódio conquista',
                'description' => 'Teste de conquista por publicação',
                'work_title' => 'Obra A',
                'language_code' => 'pt-BR',
                'media_assets' => [
                    UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
                ],
            ])
            ->assertCreated();

        $postId = (int) $postResponse->json('post.id');

        $episodeDefinition = AchievementDefinition::query()->where('slug', 'cena-aberta')->firstOrFail();

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $owner->id,
            'achievement_definition_id' => $episodeDefinition->id,
            'level' => 1,
        ]);

        $this->withHeaders($this->authHeaders($liker))
            ->postJson("/api/v1/posts/{$postId}/like")
            ->assertOk();

        $this->withHeaders($this->authHeaders($liker))
            ->postJson("/api/v1/posts/{$postId}/like")
            ->assertOk();

        $likeDefinition = AchievementDefinition::query()->where('slug', 'primeiro-aplauso')->firstOrFail();

        $this->assertDatabaseHas('user_achievement_progress', [
            'user_id' => $owner->id,
            'achievement_definition_id' => $likeDefinition->id,
            'progress_value' => 1,
        ]);

        $latestNotification = $owner->notifications()->latest()->first();
        $this->assertNotNull($latestNotification);
        $this->assertSame('achievement_unlocked', $latestNotification->data['type'] ?? null);
    }

    public function test_comment_achievement_counts_only_one_comment_per_post_for_same_user(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $commenter = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'achievements-comment-org', 'Achievements Comment Org');

        $postOneId = $this->createPostAndReturnId($owner, $organization, 'Post One');
        $postTwoId = $this->createPostAndReturnId($owner, $organization, 'Post Two');

        $this->withHeaders($this->authHeaders($commenter))
            ->postJson("/api/v1/posts/{$postOneId}/comments", ['body' => 'Primeiro comentário'])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($commenter))
            ->postJson("/api/v1/posts/{$postOneId}/comments", ['body' => 'Segundo comentário mesmo post'])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($commenter))
            ->postJson("/api/v1/posts/{$postTwoId}/comments", ['body' => 'Comentário em outro post'])
            ->assertCreated();

        $commentDefinition = AchievementDefinition::query()->where('slug', 'falou-ta-falado')->firstOrFail();

        $this->assertDatabaseHas('user_achievement_progress', [
            'user_id' => $commenter->id,
            'achievement_definition_id' => $commentDefinition->id,
            'progress_value' => 2,
        ]);

        $this->assertDatabaseCount('achievement_comment_uniques', 2);
    }

    public function test_test_creation_and_submission_unlocks_feed_and_notifications(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $candidate = User::factory()->create();

        $organization = $this->createOrganizationWithOwner($owner, 'achievements-dubbing-test-org', 'Achievements Dubbing Test Org');

        $createResponse = $this->withHeaders($this->authHeaders($owner))
            ->postJson("/api/v1/organizations/{$organization->slug}/dubbing-tests", [
                'title' => 'Teste Conquista',
                'description' => 'Descrição',
                'visibility' => 'external',
                'starts_at' => now()->subDay()->toIso8601String(),
                'ends_at' => now()->addDays(10)->toIso8601String(),
                'results_release_at' => now()->addDays(12)->toIso8601String(),
                'characters' => [
                    [
                        'name' => 'Personagem A',
                        'appearance_estimate' => 'protagonista',
                    ],
                ],
            ])
            ->assertCreated();

        $dubbingTestId = (int) $createResponse->json('dubbing_test.id');
        $dubbingTest = DubbingTest::query()->findOrFail($dubbingTestId);

        $characterId = (int) $dubbingTest->characters()->value('id');

        $this->withHeaders($this->authHeaders($owner))
            ->patchJson("/api/v1/organizations/{$organization->slug}/dubbing-tests/{$dubbingTestId}", [
                'status' => 'published',
            ])->assertOk();

        $this->withHeaders($this->authHeaders($candidate))
            ->postJson("/api/v1/dubbing-tests/{$dubbingTestId}/submissions", [
                'character_id' => $characterId,
                'cover_letter' => 'Minha interpretação',
                'media' => [
                    UploadedFile::fake()->create('candidate.mp3', 180, 'audio/mpeg'),
                ],
            ])->assertCreated();

        $createDefinition = AchievementDefinition::query()->where('slug', 'abriu-os-testes')->firstOrFail();
        $submissionDefinition = AchievementDefinition::query()->where('slug', 'primeiro-teste')->firstOrFail();

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $owner->id,
            'achievement_definition_id' => $createDefinition->id,
            'level' => 1,
        ]);

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $candidate->id,
            'achievement_definition_id' => $submissionDefinition->id,
            'level' => 1,
        ]);

        $this->withHeaders($this->authHeaders($candidate))
            ->getJson('/api/v1/achievements/feed?per_page=10')
            ->assertOk()
            ->assertJsonPath('data.0.definition.slug', 'primeiro-teste');

        $latestCandidateNotification = $candidate->notifications()->latest()->first();
        $this->assertNotNull($latestCandidateNotification);
        $this->assertSame('achievement_unlocked', $latestCandidateNotification->data['type'] ?? null);
    }

    private function authHeaders(User $user): array
    {
        $token = auth('api')->login($user);

        return [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];
    }

    private function createOrganizationWithOwner(User $owner, string $slug, string $name): Organization
    {
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => $name,
            'slug' => $slug,
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        return $organization;
    }

    private function createPostAndReturnId(User $author, Organization $organization, string $title): int
    {
        $response = $this->withHeaders($this->authHeaders($author))
            ->post('/api/v1/organizations/'.$organization->slug.'/posts', [
                'title' => $title,
                'description' => 'Post para comentários',
                'work_title' => 'Obra',
                'language_code' => 'pt-BR',
                'media_assets' => [UploadedFile::fake()->create(Str::slug($title).'.mp3', 64, 'audio/mpeg')],
            ])
            ->assertCreated();

        return (int) $response->json('post.id');
    }
}
