<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class MediaAccessApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_protected_media_requires_signed_url(): void
    {
        Storage::fake('local');

        $path = 'dubbing-media/protected-audio.mp3';
        Storage::disk('local')->put($path, 'fake-audio-content');

        $response = $this->get('/api/v1/media/'.$path);

        $response->assertStatus(403);
    }

    public function test_signed_url_can_access_protected_media(): void
    {
        Storage::fake('local');

        $path = 'dubbing-media/protected-signed.mp3';
        Storage::disk('local')->put($path, 'fake-audio-content');

        $signedUrl = URL::temporarySignedRoute(
            'api.v1.media.show',
            now()->addMinutes(10),
            ['path' => $path]
        );

        $response = $this->get($signedUrl);

        $response->assertOk();
        $response->assertHeader('Accept-Ranges', 'bytes');
    }

    public function test_post_payload_returns_signed_media_urls(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $owner = User::factory()->create();
        $editor = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Media Secure Org',
            'slug' => 'media-secure-org',
            'is_public' => true,
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
            'user_id' => $editor->id,
            'role' => 'editor',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $token = auth('api')->login($editor);

        $create = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->post('/api/v1/organizations/'.$organization->slug.'/posts', [
            'title' => 'Episódio com mídia assinada',
            'work_title' => 'Obra Privada',
            'language_code' => 'pt-BR',
            'media_assets' => [
                UploadedFile::fake()->create('episode.mp3', 128, 'audio/mpeg'),
            ],
        ]);

        $create->assertCreated();

        $signedMedia = (string) $create->json('post.media_path');
        $firstSignedAsset = (string) $create->json('post.metadata.assets.0.path');

        $this->assertStringContainsString('/api/v1/media/', $signedMedia);
        $this->assertStringContainsString('signature=', $signedMedia);
        $this->assertStringContainsString('/api/v1/media/', $firstSignedAsset);
        $this->assertStringContainsString('signature=', $firstSignedAsset);

    }
}
