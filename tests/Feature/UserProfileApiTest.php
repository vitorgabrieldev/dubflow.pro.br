<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_profile_is_hidden_for_users_not_followed_by_owner(): void
    {
        $owner = User::factory()->create([
            'is_private' => true,
        ]);
        $viewer = User::factory()->create();

        $viewerToken = auth('api')->login($viewer);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}")
            ->assertStatus(403);
    }

    public function test_private_profile_is_visible_when_owner_follows_the_viewer(): void
    {
        $owner = User::factory()->create([
            'is_private' => true,
        ]);
        $viewer = User::factory()->create();

        DB::table('user_follows')->insert([
            'follower_user_id' => $owner->id,
            'followed_user_id' => $viewer->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $viewerToken = auth('api')->login($viewer);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('user.id', $owner->id);
    }

    public function test_authenticated_user_can_follow_and_unfollow_another_user(): void
    {
        $viewer = User::factory()->create();
        $target = User::factory()->create();

        $viewerToken = auth('api')->login($viewer);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/users/{$target->id}/follow")
            ->assertOk();

        $this->assertDatabaseHas('user_follows', [
            'follower_user_id' => $viewer->id,
            'followed_user_id' => $target->id,
        ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/users/{$target->id}/follow")
            ->assertOk();

        $this->assertDatabaseMissing('user_follows', [
            'follower_user_id' => $viewer->id,
            'followed_user_id' => $target->id,
        ]);
    }
}
