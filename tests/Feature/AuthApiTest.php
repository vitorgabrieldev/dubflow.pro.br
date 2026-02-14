<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_login_and_fetch_profile(): void
    {
        $register = $this->postJson('/api/v1/auth/register', [
            'name' => 'Dub Tester',
            'email' => 'dub.tester@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'locale' => 'pt-BR',
        ]);

        $register->assertCreated()->assertJsonStructure([
            'access_token',
            'token_type',
            'expires_in',
            'user' => ['id', 'email'],
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'dub.tester@example.com',
            'password' => 'password123',
        ]);

        $login->assertOk();
        $token = (string) $login->json('access_token');
        $this->assertNotEmpty($token);

        $me = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/v1/auth/me');

        $me->assertOk()->assertJsonPath('user.email', 'dub.tester@example.com');
    }

    public function test_user_can_update_profile_with_extended_fields(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'email' => 'profile@example.com',
        ]);

        $token = auth('api')->login($user);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->patch('/api/v1/auth/profile', [
            'name' => 'Novo Nome',
            'stage_name' => 'Voz Oficial',
            'bio' => 'Perfil completo para dublagem.',
            'website_url' => 'https://dubflow.dev/profile',
            'skills' => ['ADR', 'Locução'],
            'tags' => ['Anime', 'Série'],
            'social_links' => [
                ['label' => 'Instagram', 'url' => 'https://instagram.com/dubflow'],
            ],
            'profile_links' => [
                ['label' => 'Portfólio', 'url' => 'https://dubflow.dev/portfolio'],
            ],
            'dubbing_history' => 'Naruto, One Piece, Attack on Titan',
            'avatar' => UploadedFile::fake()->image('avatar.png'),
            'cover' => UploadedFile::fake()->image('cover.png'),
        ]);

        $response->assertOk()->assertJsonPath('user.stage_name', 'Voz Oficial');
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Novo Nome',
            'stage_name' => 'Voz Oficial',
        ]);
    }

    public function test_change_password_invalidates_previous_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'password-change@example.com',
            'password' => 'password123',
        ]);

        $token = auth('api')->login($user);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/auth/change-password', [
            'current_password' => 'password123',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/auth/me')
            ->assertStatus(401);

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));

        $this->flushHeaders();
        $this->postJson('/api/v1/auth/login', [
            'email' => 'password-change@example.com',
            'password' => 'newpassword123',
        ])->assertOk();
    }

    public function test_user_can_reset_password_using_reset_token(): void
    {
        $user = User::factory()->create([
            'email' => 'reset-flow@example.com',
            'password' => 'password123',
        ]);

        $forgot = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset-flow@example.com',
        ])->assertOk();

        $token = (string) $forgot->json('reset_token');
        $this->assertNotEmpty($token);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset-flow@example.com',
            'token' => $token,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'reset-flow@example.com',
            'password' => 'password123',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'reset-flow@example.com',
            'password' => 'newpassword123',
        ])->assertOk();
    }
}
