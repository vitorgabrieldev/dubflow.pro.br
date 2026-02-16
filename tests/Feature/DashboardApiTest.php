<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\DubbingTest;
use App\Models\DubbingTestCharacter;
use App\Models\DubbingTestSubmission;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\PostLike;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_overview_returns_summary_organizations_and_top_posts(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationWithOwner($user, 'dashboard-overview-org');
        $post = $this->createPublishedPost($organization->id, $user->id, now()->subHour());

        $token = auth('api')->login($user);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/dashboard/overview');

        $response->assertOk()
            ->assertJsonPath('summary.total_posts', 1)
            ->assertJsonPath('organizations.0.id', $organization->id)
            ->assertJsonPath('top_posts.0.id', $post->id);
    }

    public function test_rising_dubbers_30_days_prioritizes_episodes_consistency_submissions_and_tests(): void
    {
        $viewer = User::factory()->create();
        $dubberStrong = User::factory()->create(['name' => 'Dubber Strong']);
        $dubberLikesHeavy = User::factory()->create(['name' => 'Dubber Likes Heavy']);

        $organization = $this->createOrganizationWithOwner($viewer, 'rising-dubbers-org');

        $postA1 = $this->createPublishedPost($organization->id, $dubberStrong->id, now()->subDays(4));
        $postA2 = $this->createPublishedPost($organization->id, $dubberStrong->id, now()->subDays(12));
        $postB1 = $this->createPublishedPost($organization->id, $dubberLikesHeavy->id, now()->subDays(3));

        // Comentários e likes devem ter prioridade menor no score.
        $this->attachInteractions($postA1->id, comments: 2, likes: 2);
        $this->attachInteractions($postB1->id, comments: 12, likes: 12);

        // Forte em inscrições e criação de testes nos últimos 30 dias.
        $testCreatedByStrong = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $dubberStrong->id,
            'title' => 'Teste do Strong',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDays(8),
            'ends_at' => now()->addDays(10),
            'results_release_at' => now()->addDays(20),
        ]);

        DubbingTestCharacter::create([
            'dubbing_test_id' => $testCreatedByStrong->id,
            'name' => 'Personagem 1',
            'appearance_estimate' => 'coadjuvante',
        ]);

        $testForSubmissions = DubbingTest::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $viewer->id,
            'title' => 'Teste para inscrições',
            'visibility' => 'external',
            'status' => 'published',
            'starts_at' => now()->subDays(6),
            'ends_at' => now()->addDays(10),
            'results_release_at' => now()->addDays(20),
        ]);

        $characterOne = DubbingTestCharacter::create([
            'dubbing_test_id' => $testForSubmissions->id,
            'name' => 'Personagem 2',
            'appearance_estimate' => 'coadjuvante',
        ]);

        $characterTwo = DubbingTestCharacter::create([
            'dubbing_test_id' => $testForSubmissions->id,
            'name' => 'Personagem 3',
            'appearance_estimate' => 'coadjuvante',
        ]);

        DubbingTestSubmission::create([
            'dubbing_test_id' => $testForSubmissions->id,
            'character_id' => $characterOne->id,
            'user_id' => $dubberStrong->id,
            'status' => 'submitted',
        ]);

        DubbingTestSubmission::create([
            'dubbing_test_id' => $testForSubmissions->id,
            'character_id' => $characterTwo->id,
            'user_id' => $dubberStrong->id,
            'status' => 'submitted',
        ]);

        $token = auth('api')->login($viewer);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/dashboard/rising-dubbers?limit=5');

        $response->assertOk()->assertJsonPath('window_days', 30);

        $data = collect($response->json('data'));
        $this->assertTrue($data->isNotEmpty());

        $first = $data->first();
        $this->assertSame($dubberStrong->id, (int) ($first['id'] ?? 0));
        $this->assertSame(2, (int) ($first['metrics']['episodes_launched'] ?? 0));
        $this->assertSame(2, (int) ($first['metrics']['role_submissions'] ?? 0));
        $this->assertSame(1, (int) ($first['metrics']['tests_created'] ?? 0));

        $likesHeavyRow = $data->firstWhere('id', $dubberLikesHeavy->id);
        $this->assertNotNull($likesHeavyRow);
        $this->assertTrue((float) ($first['score'] ?? 0) > (float) ($likesHeavyRow['score'] ?? 0));
    }

    public function test_rising_dubbers_30_days_ignores_data_older_than_window(): void
    {
        $viewer = User::factory()->create();
        $recentUser = User::factory()->create(['name' => 'Recent User']);
        $oldUser = User::factory()->create(['name' => 'Old User']);

        $organization = $this->createOrganizationWithOwner($viewer, 'rising-dubbers-window-org');

        $this->createPublishedPost($organization->id, $recentUser->id, now()->subDays(5));
        $this->createPublishedPost($organization->id, $oldUser->id, now()->subDays(45));

        $token = auth('api')->login($viewer);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/dashboard/rising-dubbers?limit=10');

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->map(fn ($value) => (int) $value)->all();
        $this->assertContains($recentUser->id, $ids);
        $this->assertNotContains($oldUser->id, $ids);
    }

    private function createOrganizationWithOwner(User $owner, string $slug): Organization
    {
        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org '.$slug,
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

    private function createPublishedPost(int $organizationId, int $authorId, \Illuminate\Support\Carbon $publishedAt): DubbingPost
    {
        return DubbingPost::create([
            'organization_id' => $organizationId,
            'author_user_id' => $authorId,
            'title' => 'Post '.uniqid('', true),
            'media_path' => 'https://example.com/audio.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
            'duration_seconds' => 120,
            'visibility' => 'public',
            'published_at' => $publishedAt,
        ]);
    }

    private function attachInteractions(int $postId, int $comments, int $likes): void
    {
        for ($i = 0; $i < $comments; $i++) {
            $commentUser = User::factory()->create();

            Comment::create([
                'post_id' => $postId,
                'user_id' => $commentUser->id,
                'body' => 'Comentário '.uniqid('', true),
            ]);
        }

        for ($i = 0; $i < $likes; $i++) {
            $likeUser = User::factory()->create();

            PostLike::create([
                'post_id' => $postId,
                'user_id' => $likeUser->id,
            ]);
        }
    }
}
