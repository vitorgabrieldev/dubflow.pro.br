<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

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

        return $this->respondWithToken($token);
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

    public function me(): JsonResponse
    {
        return response()->json([
            'user' => auth('api')->user(),
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

    private function respondWithToken(string $token): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user(),
        ]);
    }
}
