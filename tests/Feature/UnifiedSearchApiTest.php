<?php

namespace Tests\Feature;

use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Playlist;
use App\Models\PlaylistSeason;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnifiedSearchApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unified_search_returns_all_supported_groups(): void
    {
        $owner = User::factory()->create([
            'name' => 'Alpha Owner',
        ]);
        User::factory()->create([
            'name' => 'Alpha Voice',
            'stage_name' => 'Alpha Stage',
        ]);

        $organization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Alpha Studio',
            'slug' => 'alpha-studio',
            'description' => 'Comunidade Alpha',
            'is_public' => true,
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $playlist = Playlist::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Alpha Playlist',
            'slug' => 'alpha-playlist',
            'work_title' => 'Projeto Alpha',
            'visibility' => 'public',
        ]);

        $season = PlaylistSeason::query()->create([
            'playlist_id' => $playlist->id,
            'season_number' => 1,
            'title' => 'Temporada Alpha',
            'created_by_user_id' => $owner->id,
        ]);

        DubbingPost::query()->create([
            'organization_id' => $organization->id,
            'playlist_id' => $playlist->id,
            'season_id' => $season->id,
            'author_user_id' => $owner->id,
            'title' => 'Episódio Alpha',
            'description' => 'Teste de busca',
            'media_path' => 'dubbing-media/alpha.mp3',
            'media_type' => 'audio',
            'visibility' => 'public',
            'published_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/search/unified?q=alpha');
        $response->assertOk();

        $response->assertJsonPath('counts.users', 2);
        $response->assertJsonPath('counts.playlists', 1);
        $response->assertJsonPath('counts.organizations', 1);
        $response->assertJsonPath('counts.episodes', 1);
        $response->assertJsonPath('counts.seasons', 1);
        $response->assertJsonPath('seasons.0.playlist.id', $playlist->id);
        $response->assertJsonPath('seasons.0.organization.slug', 'alpha-studio');
    }

    public function test_unified_search_hides_private_content_for_guests_and_exposes_to_members(): void
    {
        $owner = User::factory()->create([
            'name' => 'Omega Owner',
        ]);
        $member = User::factory()->create([
            'name' => 'Omega Member',
        ]);

        $organization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Omega House',
            'slug' => 'omega-house',
            'is_public' => false,
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        OrganizationMember::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $playlist = Playlist::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Omega Playlist',
            'slug' => 'omega-playlist',
            'work_title' => 'Projeto Omega',
            'visibility' => 'private',
        ]);

        $season = PlaylistSeason::query()->create([
            'playlist_id' => $playlist->id,
            'season_number' => 2,
            'title' => 'Temporada Omega',
            'created_by_user_id' => $owner->id,
        ]);

        DubbingPost::query()->create([
            'organization_id' => $organization->id,
            'playlist_id' => $playlist->id,
            'season_id' => $season->id,
            'author_user_id' => $owner->id,
            'title' => 'Episódio Omega',
            'description' => 'Conteúdo restrito',
            'media_path' => 'dubbing-media/omega.mp3',
            'media_type' => 'audio',
            'visibility' => 'private',
            'published_at' => now(),
        ]);

        $guestResponse = $this->getJson('/api/v1/search/unified?q=omega');
        $guestResponse->assertOk();
        $guestResponse->assertJsonPath('counts.organizations', 0);
        $guestResponse->assertJsonPath('counts.playlists', 0);
        $guestResponse->assertJsonPath('counts.episodes', 0);
        $guestResponse->assertJsonPath('counts.seasons', 0);

        $token = auth('api')->login($member);
        $memberResponse = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/search/unified?q=omega');

        $memberResponse->assertOk();
        $memberResponse->assertJsonPath('counts.organizations', 1);
        $memberResponse->assertJsonPath('counts.playlists', 1);
        $memberResponse->assertJsonPath('counts.episodes', 1);
        $memberResponse->assertJsonPath('counts.seasons', 1);
        $memberResponse->assertJsonPath('organizations.0.slug', 'omega-house');
    }

    public function test_unified_search_hides_hidden_profile_spaces(): void
    {
        $owner = User::factory()->create([
            'name' => 'Perfil Alpha',
        ]);

        $visibleOrganization = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Alpha Studio',
            'slug' => 'alpha-studio',
            'description' => 'Comunidade Alpha',
            'is_public' => true,
        ]);

        $profileSpace = Organization::query()->create([
            'owner_user_id' => $owner->id,
            'name' => 'Perfil de Alpha',
            'slug' => 'perfil-pessoal-u'.$owner->id,
            'description' => 'Espaco tecnico Alpha',
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
                'joined_at' => now(),
            ]);
        }

        $token = auth('api')->login($owner);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/search/unified?q=alpha');

        $response->assertOk();
        $response->assertJsonPath('counts.organizations', 1);
        $response->assertJsonPath('organizations.0.slug', 'alpha-studio');
    }
}
