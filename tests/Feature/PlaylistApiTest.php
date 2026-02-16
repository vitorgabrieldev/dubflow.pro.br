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

class PlaylistApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_update_playlist_data(): void
    {
        [$owner, $organization] = $this->createOrganizationWithOwnerMember();
        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist Original',
            'slug' => 'playlist-original',
            'description' => 'Descrição antiga',
            'work_title' => 'Obra antiga',
            'release_year' => 2024,
            'visibility' => 'public',
        ]);

        $ownerToken = $this->issueToken($owner);

        $this->withHeaders($this->authHeaders($ownerToken))
            ->patchJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}", [
                'title' => 'Playlist Atualizada',
                'description' => 'Descrição nova',
                'work_title' => 'Obra nova',
                'release_year' => 2026,
            ])
            ->assertOk()
            ->assertJsonPath('playlist.title', 'Playlist Atualizada')
            ->assertJsonPath('playlist.release_year', 2026);
    }

    public function test_create_season_returns_created_and_reuses_existing_by_number(): void
    {
        [$owner, $organization] = $this->createOrganizationWithOwnerMember();
        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist de Temporadas',
            'slug' => 'playlist-temporadas',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        $ownerToken = $this->issueToken($owner);

        $this->withHeaders($this->authHeaders($ownerToken))
            ->postJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}/seasons", [
                'season_number' => 1,
                'title' => 'Temporada Um',
            ])
            ->assertCreated()
            ->assertJsonPath('season.season_number', 1)
            ->assertJsonPath('season.title', 'Temporada Um');

        $this->withHeaders($this->authHeaders($ownerToken))
            ->postJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}/seasons", [
                'season_number' => 1,
                'title' => 'Temporada Um Atualizada',
            ])
            ->assertOk()
            ->assertJsonPath('season.season_number', 1)
            ->assertJsonPath('season.title', 'Temporada Um Atualizada');

        $this->assertDatabaseCount('playlist_seasons', 1);
    }

    public function test_delete_playlist_requires_empty_playlist_without_posts(): void
    {
        [$owner, $organization] = $this->createOrganizationWithOwnerMember();
        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist com Episódio',
            'slug' => 'playlist-com-episodio',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        DubbingPost::create([
            'organization_id' => $organization->id,
            'playlist_id' => $playlist->id,
            'author_user_id' => $owner->id,
            'title' => 'Episódio vinculado',
            'description' => 'Descrição do episódio',
            'media_path' => 'tests/media/audio.wav',
            'media_type' => 'audio',
            'media_size_bytes' => 1024,
            'duration_seconds' => 120,
            'visibility' => 'public',
            'allow_comments' => true,
            'language_code' => 'pt-BR',
            'content_license' => 'all_rights_reserved',
            'published_at' => now(),
        ]);

        $ownerToken = $this->issueToken($owner);

        $this->withHeaders($this->authHeaders($ownerToken))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Remova todos os episódios desta playlist antes de excluí-la.');
    }

    public function test_owner_can_delete_empty_playlist(): void
    {
        [$owner, $organization] = $this->createOrganizationWithOwnerMember();
        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist sem episódios',
            'slug' => 'playlist-sem-episodios',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        $ownerToken = $this->issueToken($owner);

        $this->withHeaders($this->authHeaders($ownerToken))
            ->deleteJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Playlist removida com sucesso.');

        $this->assertDatabaseMissing('playlists', [
            'id' => $playlist->id,
        ]);
    }

    public function test_non_manager_cannot_update_or_create_season(): void
    {
        [$owner, $organization] = $this->createOrganizationWithOwnerMember();
        $outsider = User::factory()->create();

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist protegida',
            'slug' => 'playlist-protegida',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        $outsiderToken = $this->issueToken($outsider);

        $this->withHeaders($this->authHeaders($outsiderToken))
            ->patchJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}", [
                'title' => 'Tentativa inválida',
            ])
            ->assertForbidden();

        $this->withHeaders($this->authHeaders($outsiderToken))
            ->postJson("/api/v1/organizations/{$organization->slug}/playlists/{$playlist->id}/seasons", [
                'season_number' => 1,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('playlist_seasons', 0);
    }

    public function test_global_playlist_index_supports_q_organization_user_and_sort_filters(): void
    {
        $ownerAlpha = User::factory()->create([
            'name' => 'Ana Alpha',
            'username' => 'anaalpha',
        ]);
        $ownerBeta = User::factory()->create([
            'name' => 'Bruno Beta',
            'username' => 'brunobeta',
        ]);

        $organizationAlpha = Organization::create([
            'owner_user_id' => $ownerAlpha->id,
            'name' => 'Org Alpha',
            'slug' => 'org-alpha',
            'is_public' => true,
        ]);
        $organizationBeta = Organization::create([
            'owner_user_id' => $ownerBeta->id,
            'name' => 'Org Beta',
            'slug' => 'org-beta',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organizationAlpha->id,
            'user_id' => $ownerAlpha->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organizationBeta->id,
            'user_id' => $ownerBeta->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $playlistAlpha = Playlist::create([
            'organization_id' => $organizationAlpha->id,
            'title' => 'Alpha Beats',
            'slug' => 'alpha-beats',
            'description' => 'Playlist de referência alpha',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);
        $playlistBeta = Playlist::create([
            'organization_id' => $organizationBeta->id,
            'title' => 'Beta Voices',
            'slug' => 'beta-voices',
            'description' => 'Playlist de referência beta',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        $this->createPublishedPostForPlaylist($organizationAlpha, $playlistAlpha, $ownerAlpha, 'EP Alpha 1');
        $this->createPublishedPostForPlaylist($organizationBeta, $playlistBeta, $ownerBeta, 'EP Beta 1');
        $this->createPublishedPostForPlaylist($organizationBeta, $playlistBeta, $ownerBeta, 'EP Beta 2');

        $queryResponse = $this->getJson('/api/v1/playlists?q=Alpha&per_page=50')->assertOk();
        $queryIds = collect($queryResponse->json('data'))->pluck('id')->all();
        $this->assertContains($playlistAlpha->id, $queryIds);
        $this->assertNotContains($playlistBeta->id, $queryIds);

        $organizationResponse = $this->getJson('/api/v1/playlists?organization=org-beta&per_page=50')->assertOk();
        $organizationIds = collect($organizationResponse->json('data'))->pluck('id')->all();
        $this->assertContains($playlistBeta->id, $organizationIds);
        $this->assertNotContains($playlistAlpha->id, $organizationIds);

        $userResponse = $this->getJson('/api/v1/playlists?user=Bruno&per_page=50')->assertOk();
        $userIds = collect($userResponse->json('data'))->pluck('id')->all();
        $this->assertContains($playlistBeta->id, $userIds);
        $this->assertNotContains($playlistAlpha->id, $userIds);

        $titleSortedResponse = $this->getJson('/api/v1/playlists?sort=title&per_page=50')->assertOk();
        $titles = collect($titleSortedResponse->json('data'))->pluck('title')->values()->all();
        $sortedTitles = $titles;
        sort($sortedTitles, SORT_NATURAL | SORT_FLAG_CASE);
        $this->assertSame($sortedTitles, $titles);

        $popularResponse = $this->getJson('/api/v1/playlists?sort=popular&per_page=50')->assertOk();
        $firstPopularId = (int) ($popularResponse->json('data.0.id') ?? 0);
        $this->assertSame($playlistBeta->id, $firstPopularId);
    }

    public function test_global_playlist_index_hides_private_organization_for_guest_and_shows_for_active_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Privada Playlist',
            'slug' => 'org-privada-playlist',
            'is_public' => false,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $playlist = Playlist::create([
            'organization_id' => $organization->id,
            'title' => 'Playlist Privada Visível para Membro',
            'slug' => 'playlist-privada-membro',
            'release_year' => 2026,
            'visibility' => 'public',
        ]);

        $guestResponse = $this->getJson('/api/v1/playlists?per_page=50')->assertOk();
        $guestIds = collect($guestResponse->json('data'))->pluck('id')->all();
        $this->assertNotContains($playlist->id, $guestIds);

        $memberToken = $this->issueToken($member);
        $memberResponse = $this->withHeaders($this->authHeaders($memberToken))
            ->getJson('/api/v1/playlists?per_page=50')
            ->assertOk();

        $memberIds = collect($memberResponse->json('data'))->pluck('id')->all();
        $this->assertContains($playlist->id, $memberIds);
    }

    /**
     * @return array{0: User, 1: Organization}
     */
    private function createOrganizationWithOwnerMember(): array
    {
        $owner = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Org Playlist Test',
            'slug' => 'org-playlist-test',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        return [$owner, $organization];
    }

    /**
     * @return array<string, string>
     */
    private function authHeaders(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];
    }

    private function issueToken(User $user): string
    {
        return auth('api')->login($user);
    }

    private function createPublishedPostForPlaylist(Organization $organization, Playlist $playlist, User $author, string $title): DubbingPost
    {
        return DubbingPost::create([
            'organization_id' => $organization->id,
            'playlist_id' => $playlist->id,
            'author_user_id' => $author->id,
            'title' => $title,
            'description' => 'Descrição do episódio',
            'media_path' => 'tests/media/audio.wav',
            'media_type' => 'audio',
            'media_size_bytes' => 1024,
            'duration_seconds' => 120,
            'visibility' => 'public',
            'allow_comments' => true,
            'language_code' => 'pt-BR',
            'content_license' => 'all_rights_reserved',
            'published_at' => now(),
        ]);
    }
}
