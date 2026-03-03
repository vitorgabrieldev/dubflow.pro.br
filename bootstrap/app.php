<?php

use App\Http\Middleware\CheckUserPermission;
use App\Http\Middleware\EnsureTokenVersionMiddleware;
use App\Http\Middleware\RequestContextMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Models\SystemLog;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Schema;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        [
            'prefix' => 'api',
            'middleware' => ['api', 'auth:api'],
        ]
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeadersMiddleware::class);
        $middleware->append(RequestContextMiddleware::class);
        $middleware->appendToGroup('api', EnsureTokenVersionMiddleware::class);
        $middleware->alias([
            'permission' => CheckUserPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $exception): void {
            if (app()->runningInConsole()) {
                return;
            }

            try {
                if (! Schema::hasTable('system_logs')) {
                    return;
                }

                $request = request();
                $user = auth('api')->user();

                SystemLog::query()->create([
                    'user_type' => $user ? get_class($user) : null,
                    'user_id' => $user?->id,
                    'message' => $exception->getMessage(),
                    'level' => 'ERROR',
                    'context' => [
                        'exception' => get_class($exception),
                        'code' => $exception->getCode(),
                        'file' => $exception->getFile(),
                        'line' => $exception->getLine(),
                    ],
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                ]);
            } catch (\Throwable) {
                // Evita falha em cascata no report de exceção.
            }
        });
    })->create();
