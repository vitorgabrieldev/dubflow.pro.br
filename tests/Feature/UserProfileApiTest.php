<?php

namespace Tests\Feature;

use App\Models\AchievementDefinition;
use App\Models\AchievementLevel;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Models\UserAchievement;
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

    public function test_public_profile_exposes_message_permission_and_block_reason(): void
    {
        $target = User::factory()->create([
            'is_private' => false,
        ]);
        $viewer = User::factory()->create();
        $viewerToken = auth('api')->login($viewer);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('viewer.can_follow', true)
            ->assertJsonPath('viewer.can_message', true)
            ->assertJsonPath('viewer.message_reason', null);

        DB::table('chat_user_blocks')->insert([
            'blocker_user_id' => $viewer->id,
            'blocked_user_id' => $target->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('viewer.can_message', false)
            ->assertJsonPath('viewer.message_reason', 'Você bloqueou este usuário no chat.');
    }

    public function test_private_profile_message_permission_requires_viewer_following_owner(): void
    {
        $owner = User::factory()->create([
            'is_private' => true,
        ]);
        $viewer = User::factory()->create();

        // Permite visualizar o perfil privado por regra de reciprocidade.
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
            ->assertJsonPath('viewer.can_message', false)
            ->assertJsonPath('viewer.message_reason', 'Perfil privado: você precisa seguir este usuário para enviar mensagem.');

        DB::table('user_follows')->insert([
            'follower_user_id' => $viewer->id,
            'followed_user_id' => $owner->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('viewer.can_message', true)
            ->assertJsonPath('viewer.message_reason', null);
    }

    public function test_public_profile_exposes_communities_and_achievements_for_any_viewer(): void
    {
        $owner = User::factory()->create([
            'is_private' => false,
        ]);
        $viewer = User::factory()->create();

        $organization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Studio Aurora',
            'slug' => 'studio-aurora',
            'is_public' => true,
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'source' => 'owner_created',
            'requested_by_user_id' => $owner->id,
            'approved_by_user_id' => $owner->id,
            'joined_at' => now(),
            'approved_at' => now(),
        ]);

        $definition = AchievementDefinition::query()->create([
            'slug' => 'estrela-da-voz',
            'title' => 'Estrela da Voz',
            'description' => 'Conquista de teste',
            'category' => 'engagement',
            'metric_key' => 'episodes',
            'rarity' => 'rare',
            'icon' => 'star',
            'color_start' => '#f59e0b',
            'color_end' => '#f97316',
            'is_active' => true,
            'is_hidden' => false,
        ]);

        $level = AchievementLevel::query()->create([
            'achievement_definition_id' => $definition->id,
            'level' => 1,
            'threshold' => 1,
            'title' => 'Primeiro brilho',
        ]);

        UserAchievement::query()->create([
            'user_id' => $owner->id,
            'achievement_definition_id' => $definition->id,
            'achievement_level_id' => $level->id,
            'level' => 1,
            'progress_value_at_unlock' => 1,
            'unlocked_at' => now(),
        ]);

        $viewerToken = auth('api')->login($viewer);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('communities.0.name', 'Studio Aurora')
            ->assertJsonPath('achievements.0.definition.title', 'Estrela da Voz');
    }

    public function test_public_profile_hides_hidden_profile_space_from_summary_and_communities(): void
    {
        $owner = User::factory()->create([
            'is_private' => false,
        ]);

        $visibleOrganization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Studio Aurora',
            'slug' => 'studio-aurora',
            'is_public' => true,
        ]);

        $profileSpace = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Perfil de Voz',
            'slug' => 'perfil-pessoal-u'.$owner->id,
            'is_public' => false,
            'settings' => [
                'is_profile_space' => true,
            ],
        ]);

        foreach ([$visibleOrganization, $profileSpace] as $organization) {
            OrganizationMember::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
                'role' => 'owner',
                'status' => 'active',
                'source' => 'owner_created',
                'requested_by_user_id' => $owner->id,
                'approved_by_user_id' => $owner->id,
                'joined_at' => now(),
                'approved_at' => now(),
            ]);
        }

        $this->getJson("/api/v1/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('summary.organizations', 1)
            ->assertJsonCount(1, 'communities')
            ->assertJsonPath('communities.0.slug', 'studio-aurora');
    }

    public function test_public_profile_exposes_only_contact_links_selected_in_preferences(): void
    {
        $owner = User::factory()->create([
            'is_private' => false,
            'proposal_contact_preferences' => ['dm_plataforma', 'email'],
            'proposal_contact_links' => [
                'email' => 'contato@dubflow.dev',
                'whatsapp' => '5543999999999',
                'discord' => 'discord.gg/dubflow',
            ],
        ]);
        $viewer = User::factory()->create();

        $viewerToken = auth('api')->login($viewer);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$viewerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}")
            ->assertOk();

        $response->assertJsonPath('user.proposal_contact_preferences.0', 'dm_plataforma');
        $response->assertJsonPath('user.proposal_contact_preferences.1', 'email');
        $response->assertJsonPath('user.proposal_contact_links.email', 'contato@dubflow.dev');
        $response->assertJsonMissingPath('user.proposal_contact_links.whatsapp');
        $response->assertJsonMissingPath('user.proposal_contact_links.discord');
    }

    public function test_user_profile_caps_posts_per_page_to_50(): void
    {
        $owner = User::factory()->create();

        $organization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Perfil Posts Cap',
            'slug' => 'perfil-posts-cap',
            'is_public' => true,
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'source' => 'owner_created',
            'requested_by_user_id' => $owner->id,
            'approved_by_user_id' => $owner->id,
            'joined_at' => now(),
            'approved_at' => now(),
        ]);

        for ($index = 1; $index <= 55; $index++) {
            DubbingPost::query()->create([
                'organization_id' => $organization->id,
                'author_user_id' => $owner->id,
                'title' => 'Post '.$index,
                'media_path' => 'posts/post-'.$index.'.jpg',
                'media_type' => 'image',
                'media_size_bytes' => 1024,
                'duration_seconds' => 0,
                'visibility' => 'public',
                'allow_comments' => true,
                'language_code' => 'pt-BR',
                'content_license' => 'all_rights_reserved',
                'published_at' => now(),
            ]);
        }

        $ownerToken = auth('api')->login($owner);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$ownerToken,
            'Accept' => 'application/json',
        ])->getJson("/api/v1/users/{$owner->id}?per_page=999")
            ->assertOk()
            ->assertJsonPath('posts.per_page', 50)
            ->assertJsonCount(50, 'posts.data');
    }
}
