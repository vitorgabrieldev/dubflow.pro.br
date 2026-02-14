<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequestContextMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) ($request->header('X-Request-Id') ?: Str::uuid());
        $request->attributes->set('request_id', $requestId);

        $startedAt = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $userId = auth('api')->id();
        $path = $request->getPathInfo();

        Log::channel('request')->info('http_request', [
            'request_id' => $requestId,
            'method' => $request->getMethod(),
            'path' => $path,
            'status' => $response->getStatusCode(),
            'duration_ms' => $durationMs,
            'user_id' => $userId,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
