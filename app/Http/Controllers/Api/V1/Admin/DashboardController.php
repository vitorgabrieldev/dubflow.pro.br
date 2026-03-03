<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Log;
use App\Models\Role;
use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'users_total' => User::query()->whereHas('roles')->count(),
                'roles_total' => Role::query()->count(),
                'logs_total' => Log::query()->count(),
                'system_logs_total' => SystemLog::query()->count(),
            ],
        ]);
    }
}
