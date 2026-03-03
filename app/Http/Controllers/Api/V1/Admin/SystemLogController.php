<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\SystemLogResource;
use App\Models\SystemLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'message',
        'url',
        'created_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'uuid',
        'message',
        'url',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'level' => ['sometimes', 'in:ALERT,CRITICAL,DEBUG,EMERGENCY,ERROR,INFO,NOTICE,WARNING'],
            'method' => ['sometimes', 'in:DELETE,GET,POST'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return SystemLogResource::collection($items);
    }

    public function show(string $logUuid): SystemLogResource
    {
        $log = SystemLog::query()->with('user')->where('uuid', $logUuid)->firstOrFail();

        return new SystemLogResource($log);
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'level' => ['sometimes', 'in:ALERT,CRITICAL,DEBUG,EMERGENCY,ERROR,INFO,NOTICE,WARNING'],
            'method' => ['sometimes', 'in:DELETE,GET,POST'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'UUID', 'value' => 'uuid'],
            ['name' => 'Usuário UUID', 'value' => static fn ($item) => $item->user?->uuid],
            ['name' => 'Usuário', 'value' => static fn ($item) => $item->user?->name],
            ['name' => 'Mensagem', 'value' => 'message'],
            ['name' => 'Level', 'value' => 'level'],
            ['name' => 'IP', 'value' => 'ip'],
            ['name' => 'User Agent', 'value' => 'user_agent'],
            ['name' => 'Método', 'value' => 'method'],
            ['name' => 'URL', 'value' => 'url'],
            ['name' => 'Contexto', 'value' => 'context'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
        ], $items, 'system-logs', 'Exportou registros de erros');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = SystemLog::query()->with('user');

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        if ($request->filled('level')) {
            $query->where('level', $request->string('level')->toString());
        }

        if ($request->filled('method')) {
            $query->where('method', $request->string('method')->toString());
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }
}
