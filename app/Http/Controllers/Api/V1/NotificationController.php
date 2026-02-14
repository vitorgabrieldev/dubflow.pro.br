<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $notifications = $user->notifications()->latest()->paginate((int) $request->integer('per_page', 20));

        return response()->json([
            'items' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $notificationId): JsonResponse
    {
        $user = auth('api')->user();

        $notification = $user->notifications()->where('id', $notificationId)->firstOrFail();
        $notification->markAsRead();

        return response()->json([
            'message' => 'Notificacao marcada como lida.',
        ]);
    }

    public function markAllRead(): JsonResponse
    {
        $user = auth('api')->user();
        $user->unreadNotifications->markAsRead();

        return response()->json([
            'message' => 'Todas as notificacoes foram marcadas como lidas.',
        ]);
    }

    public function markInviteAccepted(string $notificationId): JsonResponse
    {
        $user = auth('api')->user();

        $notification = $user->notifications()->where('id', $notificationId)->firstOrFail();
        $data = $notification->data ?? [];

        if (($data['type'] ?? null) !== 'organization_member_invited') {
            abort(422, 'Notificacao invalida para aceite de convite.');
        }

        $data['invite_status'] = 'accepted';

        $notification->forceFill([
            'data' => $data,
            'read_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Convite marcado como aceito.',
        ]);
    }

    public function clearAll(): JsonResponse
    {
        $user = auth('api')->user();
        $user->notifications()->delete();

        return response()->json([
            'message' => 'Central de notificacoes limpa.',
        ]);
    }

    public function destroy(string $notificationId): JsonResponse
    {
        $user = auth('api')->user();

        $notification = $user->notifications()->where('id', $notificationId)->firstOrFail();
        $notification->delete();

        return response()->json([
            'message' => 'Notificacao removida.',
        ]);
    }
}
