<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenVersionMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken() || ! auth('api')->check()) {
            return $next($request);
        }

        try {
            $user = auth('api')->user();
            $payloadTokenVersion = (int) (auth('api')->payload()->get('token_version') ?? 0);
            $userTokenVersion = (int) ($user?->token_version ?? 0);

            if (! $user || ! (bool) $user->is_active) {
                return response()->json([
                    'message' => 'Sessão inválida. Faça login novamente.',
                ], 401);
            }

            if ($payloadTokenVersion !== $userTokenVersion) {
                return response()->json([
                    'message' => 'Sessão inválida. Faça login novamente.',
                ], 401);
            }

            if ($request->is('api/v1/admin/*') && ! $user->roles()->exists()) {
                return response()->json([
                    'message' => 'Usuário sem acesso ao painel administrativo.',
                ], 403);
            }
        } catch (JWTException) {
            return response()->json([
                'message' => 'Sessão inválida. Faça login novamente.',
            ], 401);
        }

        return $next($request);
    }
}
