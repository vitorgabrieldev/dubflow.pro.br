<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionsController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'key',
        'name',
        'group',
        'order',
        'created_at',
        'updated_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'uuid',
        'key',
        'name',
        'group',
    ];

    public function autocomplete(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
        ]);

        $query = Permission::query();
        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'group', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        $permissions = $query->get();

        $grouped = [];

        foreach ($permissions as $permission) {
            $prefix = explode('.', (string) $permission->key)[0] ?? (string) $permission->group;

            if (! isset($grouped[$prefix])) {
                $grouped[$prefix] = [
                    'name' => $permission->group,
                    'key' => $prefix,
                    'permissions' => [],
                ];
            }

            $grouped[$prefix]['permissions'][] = [
                'uuid' => $permission->uuid,
                'key' => $permission->key,
                'name' => $permission->name,
                'group' => $permission->group,
                'order' => $permission->order,
            ];
        }

        return response()->json([
            'data' => array_values($grouped),
        ]);
    }
}
