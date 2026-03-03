<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:6'],
            'token_name' => ['sometimes', 'nullable', 'string', 'max:191'],
        ]);

        $credentials = [
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_active' => 1,
        ];

        $token = auth('api')->attempt($credentials);

        if (! $token) {
            return response()->json([
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        /** @var User|null $user */
        $user = auth('api')->user();

        if (! $user || ! $user->roles()->exists()) {
            auth('api')->logout();

            return response()->json([
                'message' => 'Usuário sem acesso ao painel administrativo.',
            ], 403);
        }

        $this->logAction('account', $user->name, 'Realizou o login', $user);

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $token,
        ]);
    }

    public function logout(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->currentUser();

        if ($user) {
            $this->logAction('account', $user->name, 'Se deslogou', $user);
        }

        auth('api')->logout();

        return response()->json([], 204);
    }

    public function show(): UserResource
    {
        /** @var User $user */
        $user = $this->currentUser();
        $user->load('roles.permissions');

        return new UserResource($user);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:6'],
            'password_new' => ['required', 'string', 'min:6'],
            'password_new_confirmation' => ['required', 'string', 'same:password_new'],
        ]);

        /** @var User $user */
        $user = $this->currentUser();

        if (! Hash::check((string) $validated['password'], (string) $user->password)) {
            return response()->json([
                'message' => 'Senha atual inválida.',
                'errors' => [
                    'password' => ['Senha atual inválida.'],
                ],
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make((string) $validated['password_new']),
            'remember_token' => Str::random(60),
            'token_version' => ((int) $user->token_version) + 1,
        ]);
        $user->save();

        $this->logAction('account', $user->name, 'Alterou sua senha', $user);

        return response()->json([], 204);
    }

    public function changeAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png', 'max:2000'],
        ]);

        /** @var User $user */
        $user = $this->currentUser();

        $path = $request->file('avatar')?->store('admin/avatars', 'public');

        if (! $path) {
            return response()->json([
                'message' => 'Falha ao enviar avatar.',
            ], 500);
        }

        $user->avatar_path = $path;
        $user->save();

        $this->logAction('account', $user->name, 'Alterou seu avatar', $user);

        return response()->json([
            'file_url' => asset('storage/'.$path),
        ]);
    }

    public function passwordRecovery(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if ($user) {
            Password::broker()->sendResetLink(['email' => $user->email]);
        }

        return response()->json([
            'message' => 'Se o e-mail existir, enviaremos o link de recuperação.',
        ]);
    }
}
