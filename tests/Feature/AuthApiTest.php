<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
            'pronouns' => 'ela/dela',
            'bio' => 'Perfil completo para dublagem.',
            'website_url' => 'https://dubflow.dev/profile',
            'skills' => ['ADR', 'Locução'],
            'dubbing_languages' => ['Português (BR)', 'Inglês'],
            'voice_accents' => ['Paulista', 'Nordestino'],
            'has_recording_equipment' => true,
            'recording_equipment' => ['Microfone condensador', 'Interface de áudio'],
            'recording_equipment_other' => 'Booth acústico',
            'weekly_availability' => ['monday', 'wednesday', 'friday'],
            'state' => 'São Paulo',
            'city' => 'Campinas',
            'proposal_contact_preferences' => ['dm_plataforma', 'email'],
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

        $response->assertOk()
            ->assertJsonPath('user.stage_name', 'Voz Oficial')
            ->assertJsonPath('user.pronouns', 'ela/dela')
            ->assertJsonPath('user.state', 'São Paulo')
            ->assertJsonPath('user.city', 'Campinas')
            ->assertJsonPath('user.has_recording_equipment', true);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Novo Nome',
            'stage_name' => 'Voz Oficial',
            'pronouns' => 'ela/dela',
            'state' => 'São Paulo',
            'city' => 'Campinas',
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

    public function test_forgot_password_keeps_generic_response_for_unknown_email(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nao-existe@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Se o e-mail existir, enviaremos o link de recuperação.')
            ->assertJsonMissingPath('reset_token');
    }

    public function test_reset_password_rejects_invalid_token_and_keeps_current_password(): void
    {
        $user = User::factory()->create([
            'email' => 'invalid-token@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'invalid-token@example.com',
            'token' => 'token-invalido',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Não foi possível redefinir a senha com os dados informados.');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'invalid-token@example.com',
            'password' => 'password123',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'invalid-token@example.com',
            'password' => 'newpassword123',
        ])->assertStatus(401);
    }

    public function test_account_deletion_preview_blocks_when_user_owns_organizations(): void
    {
        $user = User::factory()->create([
            'name' => 'Dublador Dono',
            'stage_name' => 'Voz Suprema',
        ]);

        Organization::query()->create([
            'owner_user_id' => $user->id,
            'name' => 'Comunidade Alpha',
            'slug' => 'comunidade-alpha',
            'is_public' => true,
        ]);

        $token = auth('api')->login($user);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/auth/account/deletion-preview')
            ->assertOk()
            ->assertJsonPath('can_delete', false)
            ->assertJsonPath('owned_organizations.0.name', 'Comunidade Alpha')
            ->assertJsonPath('required_confirmation_phrase', 'Eu dublador Voz Suprema desejo deletar minha conta');
    }

    public function test_account_deletion_requires_exact_confirmation_phrase_and_deletes_user(): void
    {
        $user = User::factory()->create([
            'name' => 'Joana Silva',
            'stage_name' => null,
            'email' => 'delete-me@example.com',
        ]);

        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\Generic',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode(['message' => 'teste'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = auth('api')->login($user);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->deleteJson('/api/v1/auth/account', [
            'confirmation_phrase' => 'frase errada',
        ])->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $user->id]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->deleteJson('/api/v1/auth/account', [
            'confirmation_phrase' => 'Eu dublador Joana Silva desejo deletar minha conta',
        ])->assertOk()
            ->assertJsonPath('message', 'Conta removida com sucesso.');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('notifications', ['notifiable_type' => User::class, 'notifiable_id' => $user->id]);
    }
}
