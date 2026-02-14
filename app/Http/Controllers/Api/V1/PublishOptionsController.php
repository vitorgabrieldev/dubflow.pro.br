<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;

class PublishOptionsController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth('api')->user();

        $organizations = Organization::query()
            ->whereHas('members', fn ($builder) => $builder
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->with([
                'playlists' => fn ($query) => $query
                    ->where('visibility', 'public')
                    ->withCount(['posts', 'seasons'])
                    ->with([
                        'seasons' => fn ($seasonQuery) => $seasonQuery
                            ->withCount(['posts as episodes_count'])
                            ->orderBy('season_number'),
                    ])
                    ->latest(),
            ])
            ->orderByDesc('created_at')
            ->get([
                'id',
                'name',
                'slug',
                'avatar_path',
                'is_verified',
            ]);

        return response()->json([
            'organizations' => $organizations,
        ]);
    }
}
