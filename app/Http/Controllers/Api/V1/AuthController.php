<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AchievementFeedItem;
use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\DubbingTest;
use App\Models\DubbingTestSubmission;
use App\Models\Organization;
use App\Models\OrganizationFollow;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMember;
use App\Models\PostCollaborator;
use App\Models\PostLike;
use App\Models\PostView;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserAchievementProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:40', Rule::unique('users', 'username')],
            'stage_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'locale' => ['nullable', 'string', 'max:10'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'] ?? null,
            'stage_name' => $validated['stage_name'] ?? null,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'locale' => $validated['locale'] ?? 'pt-BR',
        ]);

        $token = auth('api')->login($user);

        return $this->respondWithToken($token, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! $token = auth('api')->attempt($validated)) {
            return response()->json(['message' => 'Credenciais invalidas.'], 401);
        }

        return $this->respondWithToken($token);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json([
                'message' => 'Se o e-mail existir, enviaremos o link de recuperação.',
            ]);
        }

        $token = Password::broker()->createToken($user);
        $frontendBase = rtrim((string) env('APP_FRONTEND_URL', 'http://localhost:3000'), '/');
        $locale = $user->locale ?: 'pt-BR';
        $resetLink = sprintf(
            '%s/%s/redefinir-senha?token=%s&email=%s',
            $frontendBase,
            $locale,
            urlencode($token),
            urlencode($user->email)
        );

        try {
            Mail::raw(
                "Recuperação de senha DubFlow\n\nAcesse este link para redefinir sua senha:\n{$resetLink}\n\nSe você não solicitou, ignore este e-mail.",
                static function ($message) use ($user): void {
                    $message->to($user->email)->subject('Recuperação de senha - DubFlow');
                }
            );
        } catch (Throwable) {
            // Mantém resposta genérica para não expor detalhes de infraestrutura.
        }

        $payload = [
            'message' => 'Se o e-mail existir, enviaremos o link de recuperação.',
        ];

        if (app()->environment(['local', 'testing'])) {
            $payload['reset_token'] = $token;
            $payload['reset_link'] = $resetLink;
        }

        return response()->json($payload);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::broker()->reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => (string) $request->input('password_confirmation', ''),
                'token' => $validated['token'],
            ],
            static function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ]);
                $user->token_version = (int) $user->token_version + 1;
                $user->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Não foi possível redefinir a senha com os dados informados.',
            ], 422);
        }

        return response()->json([
            'message' => 'Senha redefinida com sucesso. Faça login novamente.',
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json([
            'user' => auth('api')->user(),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'stage_name' => ['nullable', 'string', 'max:255'],
            'pronouns' => ['nullable', 'string', 'max:40'],
            'username' => [
                'nullable',
                'string',
                'max:40',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'bio' => ['nullable', 'string', 'max:4000'],
            'website_url' => ['nullable', 'url', 'max:255'],
            'locale' => ['nullable', 'string', 'max:10'],
            'skills' => ['nullable', 'array', 'max:50'],
            'skills.*' => ['string', 'max:60'],
            'dubbing_languages' => ['nullable', 'array', 'max:30'],
            'dubbing_languages.*' => ['string', 'max:60'],
            'voice_accents' => ['nullable', 'array', 'max:30'],
            'voice_accents.*' => ['string', 'max:60'],
            'has_recording_equipment' => ['nullable', 'boolean'],
            'recording_equipment' => ['nullable', 'array', 'max:30'],
            'recording_equipment.*' => ['string', 'max:80'],
            'recording_equipment_other' => ['nullable', 'string', 'max:255'],
            'weekly_availability' => ['nullable', 'array', 'max:7'],
            'weekly_availability.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'state' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:120'],
            'proposal_contact_preferences' => ['nullable', 'array', 'max:20'],
            'proposal_contact_preferences.*' => ['string', 'max:60'],
            'proposal_contact_links' => ['nullable', 'array'],
            'proposal_contact_links.email' => ['nullable', 'string', 'max:255'],
            'proposal_contact_links.whatsapp' => ['nullable', 'string', 'max:255'],
            'proposal_contact_links.discord' => ['nullable', 'string', 'max:120'],
            'tags' => ['nullable', 'array', 'max:50'],
            'tags.*' => ['string', 'max:60'],
            'social_links' => ['nullable', 'array', 'max:30'],
            'social_links.*.label' => ['required_with:social_links', 'string', 'max:60'],
            'social_links.*.url' => ['required_with:social_links', 'url', 'max:255'],
            'profile_links' => ['nullable', 'array', 'max:30'],
            'profile_links.*.label' => ['required_with:profile_links', 'string', 'max:60'],
            'profile_links.*.url' => ['required_with:profile_links', 'url', 'max:255'],
            'dubbing_history' => ['nullable', 'string', 'max:15000'],
            'is_private' => ['nullable', 'boolean'],
            'avatar' => ['nullable', 'image', 'max:5120'],
            'cover' => ['nullable', 'image', 'max:10240'],
        ]);

        if (! ($validated['has_recording_equipment'] ?? false)) {
            $validated['recording_equipment'] = [];
            $validated['recording_equipment_other'] = null;
        }

        if (isset($validated['proposal_contact_links']) && is_array($validated['proposal_contact_links'])) {
            $validated['proposal_contact_links'] = collect($validated['proposal_contact_links'])
                ->map(fn ($value) => is_string($value) ? trim($value) : null)
                ->filter(fn ($value) => is_string($value) && $value !== '')
                ->only(['email', 'whatsapp', 'discord'])
                ->all();
        }

        if ($request->hasFile('avatar')) {
            $validated['avatar_path'] = $request->file('avatar')?->store('user-avatars', 'public');
        }

        if ($request->hasFile('cover')) {
            $validated['cover_path'] = $request->file('cover')?->store('user-covers', 'public');
        }

        $user->fill($validated)->save();

        return response()->json([
            'message' => 'Perfil atualizado com sucesso.',
            'user' => $user->fresh(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Senha atual inválida.',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'remember_token' => Str::random(60),
        ]);
        $user->token_version = (int) $user->token_version + 1;
        $user->save();

        return response()->json([
            'message' => 'Senha alterada com sucesso. Faça login novamente.',
        ]);
    }

    public function accountDeletionPreview(): JsonResponse
    {
        /** @var User $user */
        $user = auth('api')->user();

        return response()->json($this->buildAccountDeletionPreview($user));
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = auth('api')->user();
        $preview = $this->buildAccountDeletionPreview($user);

        if (! ($preview['can_delete'] ?? false)) {
            return response()->json([
                'message' => 'Você precisa transferir a posse das comunidades que administra antes de excluir sua conta.',
                'preview' => $preview,
            ], 409);
        }

        $validated = $request->validate([
            'confirmation_phrase' => ['required', 'string', 'max:255'],
        ]);

        $providedPhrase = trim((string) $validated['confirmation_phrase']);
        $expectedPhrase = (string) ($preview['required_confirmation_phrase'] ?? '');

        if ($providedPhrase !== $expectedPhrase) {
            return response()->json([
                'message' => 'Frase de confirmação inválida.',
                'expected_phrase' => $expectedPhrase,
            ], 422);
        }

        DB::transaction(function () use ($user): void {
            DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->delete();

            $user->forceDelete();
        });

        auth('api')->logout();

        return response()->json([
            'message' => 'Conta removida com sucesso.',
        ]);
    }

    public function logout(): JsonResponse
    {
        auth('api')->logout();

        return response()->json(['message' => 'Sessao encerrada com sucesso.']);
    }

    public function refresh(): JsonResponse
    {
        return $this->respondWithToken(auth('api')->refresh());
    }

    private function respondWithToken(string $token, int $status = 200): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user(),
        ], $status);
    }

    /**
     * @return array{
     *     can_delete: bool,
     *     required_confirmation_phrase: string,
     *     blocker: array{code: string, message: string}|null,
     *     owned_organizations: array<int, array{id: int, name: string, slug: string}>,
     *     summary: array<int, array{key: string, label: string, count: int}>,
     *     total_items: int
     * }
     */
    private function buildAccountDeletionPreview(User $user): array
    {
        $ownedOrganizations = Organization::query()
            ->where('owner_user_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(static fn (Organization $organization): array => [
                'id' => (int) $organization->id,
                'name' => (string) $organization->name,
                'slug' => (string) $organization->slug,
            ])
            ->values()
            ->all();

        $summary = [
            [
                'key' => 'organizations_owned',
                'label' => 'Comunidades sob sua posse',
                'count' => count($ownedOrganizations),
            ],
            [
                'key' => 'organization_memberships',
                'label' => 'Participações em comunidades',
                'count' => OrganizationMember::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'organization_follows',
                'label' => 'Comunidades seguidas',
                'count' => OrganizationFollow::query()
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->count(),
            ],
            [
                'key' => 'organization_invites_created',
                'label' => 'Convites de comunidade criados',
                'count' => OrganizationInvite::query()->where('created_by_user_id', $user->id)->count(),
            ],
            [
                'key' => 'posts_authored',
                'label' => 'Episódios publicados',
                'count' => DubbingPost::query()->where('author_user_id', $user->id)->count(),
            ],
            [
                'key' => 'post_collaborations',
                'label' => 'Participações como colaborador',
                'count' => PostCollaborator::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'post_likes',
                'label' => 'Curtidas em episódios',
                'count' => PostLike::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'comments',
                'label' => 'Comentários',
                'count' => Comment::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'post_views',
                'label' => 'Registros de visualização',
                'count' => PostView::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'dubbing_tests_created',
                'label' => 'Testes de dublagem criados',
                'count' => DubbingTest::query()->where('created_by_user_id', $user->id)->count(),
            ],
            [
                'key' => 'dubbing_test_submissions',
                'label' => 'Inscrições em oportunidades',
                'count' => DubbingTestSubmission::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'chat_messages',
                'label' => 'Mensagens de chat',
                'count' => DB::table('chat_messages')
                    ->where(static function (Builder $query) use ($user): void {
                        $query->where('sender_user_id', $user->id)
                            ->orWhere('recipient_user_id', $user->id);
                    })
                    ->count(),
            ],
            [
                'key' => 'notifications',
                'label' => 'Notificações',
                'count' => DB::table('notifications')
                    ->where('notifiable_type', User::class)
                    ->where('notifiable_id', $user->id)
                    ->count(),
            ],
            [
                'key' => 'achievements',
                'label' => 'Conquistas',
                'count' => UserAchievement::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'achievement_progress',
                'label' => 'Progresso de conquistas',
                'count' => UserAchievementProgress::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'achievement_feed',
                'label' => 'Feed de conquistas',
                'count' => AchievementFeedItem::query()->where('user_id', $user->id)->count(),
            ],
            [
                'key' => 'user_following',
                'label' => 'Usuários seguidos',
                'count' => DB::table('user_follows')->where('follower_user_id', $user->id)->count(),
            ],
            [
                'key' => 'user_followers',
                'label' => 'Seguidores',
                'count' => DB::table('user_follows')->where('followed_user_id', $user->id)->count(),
            ],
        ];

        $totalItems = collect($summary)->sum(static fn (array $row): int => (int) $row['count']);
        $displayName = trim((string) ($user->stage_name ?: $user->name ?: $user->username ?: 'sem nome'));
        $canDelete = count($ownedOrganizations) === 0;

        return [
            'can_delete' => $canDelete,
            'required_confirmation_phrase' => sprintf('Eu dublador %s desejo deletar minha conta', $displayName),
            'blocker' => $canDelete
                ? null
                : [
                    'code' => 'owns_organizations',
                    'message' => 'Transfira a posse de todas as suas comunidades para outra pessoa antes de excluir sua conta.',
                ],
            'owned_organizations' => $ownedOrganizations,
            'summary' => $summary,
            'total_items' => (int) $totalItems,
        ];
    }
}
