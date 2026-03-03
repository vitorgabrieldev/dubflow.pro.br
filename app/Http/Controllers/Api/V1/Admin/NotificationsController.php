<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\NotificationResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NotificationsController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'type',
        'read_at',
        'created_at',
        'updated_at',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'is_read' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return NotificationResource::collection($items);
    }

    public function show(string $notificationId): JsonResponse
    {
        $notification = $this->findNotificationById($notificationId);
        $notification->load('notifiable');

        return response()->json([
            'data' => (new NotificationResource($notification))->resolve(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_uuid' => ['required', 'uuid', Rule::exists('users', 'uuid')],
            'type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'data' => ['sometimes', 'nullable', 'array'],
            'read_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $user = User::query()->where('uuid', $validated['user_uuid'])->firstOrFail();

        $payload = [
            ...($validated['data'] ?? []),
            'title' => $validated['title'],
            'message' => $validated['message'],
            'source' => 'admin_panel',
        ];

        $notification = DatabaseNotification::query()->create([
            'id' => (string) Str::uuid(),
            'type' => $validated['type'] ?? 'admin.manual',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => $payload,
            'read_at' => $validated['read_at'] ?? null,
        ]);

        $notification->load('notifiable');

        $this->logAction('notifications.create', (string) $notification->id, 'Criou uma notificação manual', $notification);

        return response()->json([
            'data' => (new NotificationResource($notification))->resolve(),
        ], 201);
    }

    public function update(Request $request, string $notificationId): JsonResponse
    {
        $notification = $this->findNotificationById($notificationId);

        $validated = $request->validate([
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'message' => ['sometimes', 'required', 'string', 'max:5000'],
            'data' => ['sometimes', 'nullable', 'array'],
            'is_read' => ['sometimes', 'boolean'],
        ]);

        $before = [
            'type' => $notification->type,
            'data' => $notification->data,
            'read_at' => $notification->read_at,
        ];

        $data = is_array($notification->data) ? $notification->data : [];

        if (array_key_exists('data', $validated)) {
            $data = $validated['data'] ?? [];
        }

        if (array_key_exists('title', $validated)) {
            $data['title'] = $validated['title'];
        }

        if (array_key_exists('message', $validated)) {
            $data['message'] = $validated['message'];
        }

        $notification->type = $validated['type'] ?? $notification->type;
        $notification->data = $data;

        if (array_key_exists('is_read', $validated)) {
            $notification->read_at = $validated['is_read'] ? now() : null;
        }

        $notification->save();
        $notification->load('notifiable');

        $this->logAction('notifications.edit', (string) $notification->id, 'Editou uma notificação', $notification, $before);

        return response()->json([
            'data' => (new NotificationResource($notification))->resolve(),
        ]);
    }

    public function destroy(string $notificationId): JsonResponse
    {
        $notification = $this->findNotificationById($notificationId);
        $before = [
            'id' => $notification->id,
            'type' => $notification->type,
            'notifiable_type' => $notification->notifiable_type,
            'notifiable_id' => $notification->notifiable_id,
        ];

        $notification->delete();

        $this->logAction('notifications.delete', (string) $before['id'], 'Excluiu uma notificação', $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'is_read' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'type' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $query = $this->buildIndexQuery($request);

        return NotificationResource::collection($query->limit(50)->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'is_read' => ['sometimes', 'nullable', 'integer', 'in:0,1'],
            'type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'ID', 'value' => 'id'],
            ['name' => 'Tipo', 'value' => 'type'],
            ['name' => 'Usuário', 'value' => static fn ($item) => $item->notifiable?->name],
            ['name' => 'E-mail usuário', 'value' => static fn ($item) => $item->notifiable?->email],
            ['name' => 'Título', 'value' => static fn ($item) => data_get($item->data, 'title')],
            ['name' => 'Mensagem', 'value' => static fn ($item) => data_get($item->data, 'message')],
            ['name' => 'Lida', 'value' => static fn ($item) => $item->read_at ? 'Sim' : 'Não'],
            ['name' => 'Lida em', 'value' => 'read_at', 'format' => 'datetime'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
        ], $items, 'notifications', 'Exportou notificações');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = DatabaseNotification::query()
            ->where('notifiable_type', User::class)
            ->with('notifiable');

        if ($request->filled('user_uuid')) {
            $userId = User::query()->where('uuid', $request->string('user_uuid')->toString())->value('id');
            if ($userId) {
                $query->where('notifiable_id', $userId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('is_read')) {
            if ($request->integer('is_read') === 1) {
                $query->whereNotNull('read_at');
            } else {
                $query->whereNull('read_at');
            }
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('id', 'like', '%'.$search.'%')
                    ->orWhere('type', 'like', '%'.$search.'%')
                    ->orWhere('data', 'like', '%'.$search.'%')
                    ->orWhereHasMorph('notifiable', [User::class], fn (Builder $userBuilder) => $userBuilder
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('uuid', 'like', '%'.$search.'%'));
            });
        }

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'created_at', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    private function findNotificationById(string $notificationId): DatabaseNotification
    {
        return DatabaseNotification::query()
            ->where('notifiable_type', User::class)
            ->where('id', $notificationId)
            ->firstOrFail();
    }
}
