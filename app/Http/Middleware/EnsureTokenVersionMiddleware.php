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
            $payloadTokenVersion = (int) (auth('api')->payload()->get('token_version') ?? 0);
            $userTokenVersion = (int) (auth('api')->user()?->token_version ?? 0);

            if ($payloadTokenVersion !== $userTokenVersion) {
                return response()->json([
                    'message' => 'Sessão inválida. Faça login novamente.',
                ], 401);
            }
        } catch (JWTException) {
            return response()->json([
                'message' => 'Sessão inválida. Faça login novamente.',
            ], 401);
        }

        return $next($request);
    }
}
