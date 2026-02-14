<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
}
