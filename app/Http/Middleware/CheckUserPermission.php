<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckUserPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): mixed
    {
        $user = auth('api')->user();

        if (! $user) {
            return response()->json([
                'message' => 'Não autenticado.',
            ], 401);
        }

        if (empty($permissions)) {
            return $next($request);
        }

        $user->loadMissing('roles.permissions');

        $roleCollection = $user->roles ?? collect();

        if ($roleCollection->contains(static fn ($role) => (bool) ($role->is_system ?? false))) {
            return $next($request);
        }

        $userPermissions = $user->myPermissions();

        foreach ($permissions as $permission) {
            if (in_array($permission, $userPermissions, true)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Você não tem permissão para executar esta ação.',
            'required_permissions' => $permissions,
        ], 403);
    }
}
