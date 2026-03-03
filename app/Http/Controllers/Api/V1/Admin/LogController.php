<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\LogResource;
use App\Models\Log;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'user_id',
        'log_type',
        'log_id',
        'log_name',
        'message',
        'action',
        'ip',
        'user_agent',
        'url',
        'method',
        'created_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'uuid',
        'user_id',
        'log_type',
        'log_id',
        'log_name',
        'message',
        'action',
        'ip',
        'user_agent',
        'url',
        'method',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return LogResource::collection($items);
    }

    public function show(string $logUuid): LogResource
    {
        $log = Log::query()->with('user')->where('uuid', $logUuid)->firstOrFail();

        return new LogResource($log);
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'UUID', 'value' => 'uuid'],
            ['name' => 'Usuário UUID', 'value' => static fn ($item) => $item->user?->uuid],
            ['name' => 'Usuário', 'value' => static fn ($item) => $item->user?->name],
            ['name' => 'Mensagem', 'value' => 'message'],
            ['name' => 'Item', 'value' => 'log_name'],
            ['name' => 'IP', 'value' => 'ip'],
            ['name' => 'User Agent', 'value' => 'user_agent'],
            ['name' => 'Método', 'value' => 'method'],
            ['name' => 'Ação', 'value' => 'action'],
            ['name' => 'URL', 'value' => 'url'],
            ['name' => 'Dados antigos', 'value' => 'old_data'],
            ['name' => 'Dados novos', 'value' => 'new_data'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
        ], $items, 'logs', 'Exportou registros de alterações');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = Log::query()->with('user');

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }
}
