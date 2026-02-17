<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChatMessageCreated;
use App\Events\ChatMessageStatusUpdated;
use App\Events\ChatMessageUpdated;
use App\Events\ChatTypingUpdated;
use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatConversationParticipant;
use App\Models\ChatMessage;
use App\Models\ChatMessageAttachment;
use App\Models\ChatUserBlock;
use App\Models\User;
use App\Notifications\ChatMessageReceived;
use App\Support\ChatAccess;
use App\Support\MediaAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ChatController extends Controller
{
    private const MAX_ATTACHMENT_SIZE_KB = 51200; // 50 MB
    private const MAX_CONVERSATIONS_PER_PAGE = 40;
    private const MAX_PENDING_BLOCKED_MESSAGES_PER_CONVERSATION = 120;

    /**
     * @var array<int, string>
     */
    private const ALLOWED_ATTACHMENT_MIME_TYPES = [
        'video/mp4',
        'video/quicktime',
        'video/x-matroska',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/x-wav',
        'audio/flac',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/heic',
        'image/heif',
    ];

    public function conversations(Request $request): JsonResponse
    {
        $viewer = auth('api')->user();
        $perPage = max(1, min(self::MAX_CONVERSATIONS_PER_PAGE, (int) $request->integer('per_page', 20)));
        $requestedPage = max(1, (int) $request->integer('page', 1));

        $participants = ChatConversationParticipant::query()
            ->where('user_id', $viewer->id)
            ->with([
                'conversation.userOne:id,name,stage_name,username,avatar_path,is_private',
                'conversation.userTwo:id,name,stage_name,username,avatar_path,is_private',
                'conversation.lastMessage.sender:id,name,stage_name,username,avatar_path',
                'conversation.lastMessage.attachments',
            ])
            ->get();

        $allPeerIds = $participants
            ->map(function (ChatConversationParticipant $participant) use ($viewer): ?int {
                return $participant->conversation?->peerUserId($viewer->id);
            })
            ->filter()
            ->values();

        $blockedByMeFromAll = ChatUserBlock::query()
            ->where('blocker_user_id', $viewer->id)
            ->whereIn('blocked_user_id', $allPeerIds)
            ->pluck('blocked_user_id')
            ->map(static fn ($value) => (int) $value)
            ->all();

        $visibleParticipants = $participants->filter(function (ChatConversationParticipant $participant) use ($viewer, $blockedByMeFromAll): bool {
            $conversation = $participant->conversation;
            if (! $conversation) {
                return false;
            }

            if ($participant->hidden_at === null) {
                return true;
            }

            $lastMessageCreatedAt = $conversation->lastMessage?->created_at;
            $peerUserId = $conversation->peerUserId($viewer->id);

            if ($peerUserId !== null && in_array((int) $peerUserId, $blockedByMeFromAll, true)) {
                return true;
            }

            return $lastMessageCreatedAt !== null && $lastMessageCreatedAt->gt($participant->hidden_at);
        })->values();

        $conversationIds = $visibleParticipants->pluck('conversation_id')->filter()->values();
        $this->markConversationsAsDelivered($viewer->id, $conversationIds);

        $unreadByConversation = ChatMessage::query()
            ->selectRaw('conversation_id, COUNT(*) as unread_count')
            ->whereIn('conversation_id', $conversationIds)
            ->where('recipient_user_id', $viewer->id)
            ->whereNull('read_at')
            ->whereNotIn('sender_user_id', function ($query) use ($viewer): void {
                $query->select('blocked_user_id')
                    ->from('chat_user_blocks')
                    ->where('blocker_user_id', $viewer->id);
            })
            ->groupBy('conversation_id')
            ->pluck('unread_count', 'conversation_id');

        $peerIds = $visibleParticipants
            ->map(function (ChatConversationParticipant $participant) use ($viewer): ?int {
                return $participant->conversation?->peerUserId($viewer->id);
            })
            ->filter()
            ->values();

        $blockedByMe = ChatUserBlock::query()
            ->where('blocker_user_id', $viewer->id)
            ->whereIn('blocked_user_id', $peerIds)
            ->pluck('blocked_user_id')
            ->map(static fn ($value) => (int) $value)
            ->all();

        $blockedMe = ChatUserBlock::query()
            ->where('blocked_user_id', $viewer->id)
            ->whereIn('blocker_user_id', $peerIds)
            ->pluck('blocker_user_id')
            ->map(static fn ($value) => (int) $value)
            ->all();

        $items = $visibleParticipants
            ->map(function (ChatConversationParticipant $participant) use ($viewer, $unreadByConversation, $blockedByMe, $blockedMe): ?array {
                $conversation = $participant->conversation;
                if (! $conversation) {
                    return null;
                }

                $peer = $this->resolvePeerUser($conversation, $viewer->id);
                if (! $peer) {
                    return null;
                }

                $lastMessage = $conversation->lastMessage;
                $lastActivityAt = $lastMessage?->created_at ?? $conversation->updated_at;

                return [
                    'id' => $conversation->id,
                    'peer' => array_merge(
                        $this->transformUserPreview($peer),
                        ['custom_name' => $this->normalizePeerAlias($participant->peer_alias)]
                    ),
                    'last_message' => $lastMessage ? $this->transformMessage($lastMessage, $viewer->id) : null,
                    'unread_count' => (int) ($unreadByConversation[$conversation->id] ?? 0),
                    'is_blocked_by_me' => in_array($peer->id, $blockedByMe, true),
                    'has_blocked_me' => in_array($peer->id, $blockedMe, true),
                    'updated_at' => optional($lastActivityAt)->toIso8601String(),
                    '_sort_at' => optional($lastActivityAt)->getTimestamp() ?? 0,
                ];
            })
            ->filter()
            ->sortByDesc('_sort_at')
            ->map(function (array $item): array {
                unset($item['_sort_at']);

                return $item;
            })
            ->values();

        $total = $items->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = min($requestedPage, $lastPage);
        $pagedItems = $items->forPage($currentPage, $perPage)->values();

        return response()->json([
            'items' => $pagedItems,
            'pagination' => [
                'current_page' => $currentPage,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'total' => $total,
                'has_more' => $currentPage < $lastPage,
            ],
        ]);
    }

    public function startConversation(User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        $access = ChatAccess::canSendMessage($viewer, $user);
        if (! $access['allowed']) {
            abort(403, (string) $access['reason']);
        }

        $conversation = $this->findOrCreateConversation($viewer->id, $user->id);

        ChatConversationParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $viewer->id)
            ->update([
                'hidden_at' => null,
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);
        $participant = $this->ensureParticipant($viewer->id, $conversation);

        $conversation->load([
            'userOne:id,name,stage_name,username,avatar_path,is_private',
            'userTwo:id,name,stage_name,username,avatar_path,is_private',
            'lastMessage.sender:id,name,stage_name,username,avatar_path',
            'lastMessage.attachments',
        ]);

        $peer = $this->resolvePeerUser($conversation, $viewer->id);

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'peer' => $peer
                    ? array_merge(
                        $this->transformUserPreview($peer),
                        ['custom_name' => $this->normalizePeerAlias($participant->peer_alias)]
                    )
                    : null,
                'last_message' => $conversation->lastMessage ? $this->transformMessage($conversation->lastMessage, $viewer->id) : null,
                'unread_count' => $this->unreadCount($conversation->id, $viewer->id),
            ],
        ]);
    }

    public function renameConversationPeer(Request $request, ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();
        $participant = $this->ensureParticipant($viewer->id, $conversation);

        $validated = $request->validate([
            'peer_alias' => ['nullable', 'string', 'max:80'],
        ]);

        $peerAlias = $this->normalizePeerAlias($validated['peer_alias'] ?? null);

        $participant->forceFill([
            'peer_alias' => $peerAlias,
            'updated_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Nome do contato atualizado.',
            'conversation_id' => $conversation->id,
            'peer_alias' => $peerAlias,
        ]);
    }

    public function messages(Request $request, ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();
        $participant = $this->ensureParticipant($viewer->id, $conversation);

        $participant->forceFill([
            'hidden_at' => null,
            'last_seen_at' => now(),
        ])->save();

        $perPage = max(1, min(100, (int) $request->integer('per_page', 40)));
        $beforeId = max(0, (int) $request->integer('before_id', 0));

        $query = $conversation->messages()
            ->with([
                'sender:id,name,stage_name,username,avatar_path',
                'attachments',
            ])
            ->orderByDesc('id');

        if ($beforeId > 0) {
            $query->where('id', '<', $beforeId);
        }

        $messages = $query->limit($perPage + 1)->get();
        $hasMore = $messages->count() > $perPage;

        $slice = $messages
            ->take($perPage)
            ->sortBy('id')
            ->values();

        $blockedByViewerIds = ChatUserBlock::query()
            ->where('blocker_user_id', $viewer->id)
            ->pluck('blocked_user_id')
            ->map(static fn ($value) => (int) $value)
            ->all();

        $filteredSlice = $slice->filter(
            fn (ChatMessage $message): bool => ! in_array((int) $message->sender_user_id, $blockedByViewerIds, true)
        );
        $this->markMessagesDeliveredAndRead($viewer->id, $filteredSlice);

        $oldestLoadedMessage = $slice->first();

        return response()->json([
            'items' => $slice
                ->filter(fn (ChatMessage $message): bool => ! in_array((int) $message->sender_user_id, $blockedByViewerIds, true))
                ->map(fn (ChatMessage $message) => $this->transformMessage($message, $viewer->id))
                ->values(),
            'has_more' => $hasMore,
            'next_before_id' => $hasMore && $oldestLoadedMessage ? $oldestLoadedMessage->id : null,
        ]);
    }

    public function sendMessage(Request $request, ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();
        $participant = $this->ensureParticipant($viewer->id, $conversation);

        $peerUserId = $conversation->peerUserId($viewer->id);
        if (! $peerUserId) {
            abort(403, 'Sem permissão para enviar mensagem nesta conversa.');
        }

        $recipient = User::query()->findOrFail($peerUserId);

        $access = ChatAccess::canSendMessage($viewer, $recipient);
        if (! $access['allowed']) {
            abort(403, (string) $access['reason']);
        }

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:8'],
            'attachments.*' => [
                'file',
                'max:'.self::MAX_ATTACHMENT_SIZE_KB,
                'mimetypes:'.implode(',', self::ALLOWED_ATTACHMENT_MIME_TYPES),
            ],
        ]);

        $body = isset($validated['body']) ? trim((string) $validated['body']) : null;
        if ($body === '') {
            $body = null;
        }

        $attachmentFiles = $request->file('attachments', []);
        if ($attachmentFiles instanceof UploadedFile) {
            $attachmentFiles = [$attachmentFiles];
        }

        $files = collect(is_array($attachmentFiles) ? $attachmentFiles : [])
            ->filter(fn ($file): bool => $file instanceof UploadedFile)
            ->values();

        if ($body === null && $files->isEmpty()) {
            abort(422, 'Envie um texto ou ao menos um anexo.');
        }

        $recipientBlockedSender = ChatAccess::isBlockedBy($recipient->id, $viewer->id);
        if ($recipientBlockedSender) {
            if ($files->isNotEmpty()) {
                abort(422, 'Envio de anexos indisponível enquanto este usuário mantém você bloqueado.');
            }

            $pendingBlockedMessages = ChatMessage::query()
                ->where('conversation_id', $conversation->id)
                ->where('sender_user_id', $viewer->id)
                ->where('recipient_user_id', $recipient->id)
                ->whereNull('delivered_at')
                ->count();

            if ($pendingBlockedMessages >= self::MAX_PENDING_BLOCKED_MESSAGES_PER_CONVERSATION) {
                abort(429, 'Limite de mensagens pendentes atingido nesta conversa bloqueada.');
            }
        }

        $message = DB::transaction(function () use ($conversation, $viewer, $recipient, $body, $files, $participant): ChatMessage {
            $message = ChatMessage::query()->create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $viewer->id,
                'recipient_user_id' => $recipient->id,
                'body' => $body,
            ]);

            foreach ($files as $file) {
                /** @var UploadedFile $file */
                ChatMessageAttachment::query()->create([
                    'message_id' => $message->id,
                    'media_path' => $file->store('chat-media', 'local'),
                    'media_type' => $this->resolveAttachmentType($file->getMimeType()),
                    'mime' => $file->getMimeType(),
                    'original_name' => $file->getClientOriginalName(),
                    'size_bytes' => (int) ($file->getSize() ?? 0),
                ]);
            }

            $conversation->forceFill([
                'last_message_id' => $message->id,
                'updated_at' => now(),
            ])->save();

            ChatConversationParticipant::query()
                ->where('conversation_id', $conversation->id)
                ->whereIn('user_id', [$viewer->id, $recipient->id])
                ->update([
                    'hidden_at' => null,
                    'updated_at' => now(),
                ]);

            $participant->forceFill([
                'last_seen_at' => now(),
            ])->save();

            return $message;
        });

        $message->load([
            'sender:id,name,stage_name,username,avatar_path',
            'attachments',
        ]);

        $payload = [
            'conversation_id' => $conversation->id,
            'message' => $this->transformMessage($message),
        ];

        if (! $recipientBlockedSender) {
            $this->broadcastSafely(new ChatMessageCreated($payload, $viewer->id, $recipient->id));
            $recipient->notify(new ChatMessageReceived($conversation, $message, $viewer));
        }

        return response()->json([
            'message' => $this->transformMessage($message, $viewer->id),
        ], 201);
    }

    public function updateMessage(Request $request, ChatMessage $message): JsonResponse
    {
        $viewer = auth('api')->user();

        if ((int) $message->sender_user_id !== (int) $viewer->id) {
            abort(403, 'Você só pode editar as próprias mensagens.');
        }

        if ($message->deleted_at !== null) {
            abort(422, 'Não é possível editar uma mensagem removida.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $body = trim((string) $validated['body']);
        if ($body === '') {
            abort(422, 'A mensagem não pode ficar vazia.');
        }

        if ($message->body !== $body) {
            $message->forceFill([
                'body' => $body,
                'edited_at' => now(),
            ])->save();

            $conversation = $message->conversation()->first();
            if ($conversation) {
                $conversation->touch();

                $payload = [
                    'conversation_id' => $conversation->id,
                    'message' => $this->transformMessage($message),
                ];

                $this->broadcastSafely(new ChatMessageUpdated($payload, $conversation->user_one_id, $conversation->user_two_id));
            }
        }

        $message->loadMissing([
            'sender:id,name,stage_name,username,avatar_path',
            'attachments',
        ]);

        return response()->json([
            'message' => $this->transformMessage($message, $viewer->id),
        ]);
    }

    public function destroyMessage(ChatMessage $message): JsonResponse
    {
        $viewer = auth('api')->user();

        if ((int) $message->sender_user_id !== (int) $viewer->id) {
            abort(403, 'Você só pode remover as próprias mensagens.');
        }

        if ($message->deleted_at === null) {
            $message->forceFill([
                'body' => null,
                'deleted_at' => now(),
                'edited_at' => null,
            ])->save();

            $conversation = $message->conversation()->first();
            if ($conversation) {
                $conversation->touch();

                $payload = [
                    'conversation_id' => $conversation->id,
                    'message' => $this->transformMessage($message),
                ];

                $this->broadcastSafely(new ChatMessageUpdated($payload, $conversation->user_one_id, $conversation->user_two_id));
            }
        }

        return response()->json([
            'message' => $this->transformMessage($message, $viewer->id),
        ]);
    }

    public function markConversationRead(ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();

        $this->ensureParticipant($viewer->id, $conversation);
        $blockedSenderIds = $this->blockedSenderIdsForViewer($viewer->id);

        $incoming = $conversation->messages()
            ->where('recipient_user_id', $viewer->id)
            ->whereNull('read_at')
            ->when($blockedSenderIds !== [], fn ($query) => $query->whereNotIn('sender_user_id', $blockedSenderIds))
            ->orderBy('id')
            ->get();

        $this->markMessagesDeliveredAndRead($viewer->id, $incoming);

        return response()->json([
            'message' => 'Conversa marcada como lida.',
            'unread_count' => 0,
        ]);
    }

    public function typing(Request $request, ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();
        $this->ensureParticipant($viewer->id, $conversation);

        $validated = $request->validate([
            'is_typing' => ['required', 'boolean'],
        ]);

        $peerUserId = $conversation->peerUserId($viewer->id);
        if (! $peerUserId) {
            abort(403, 'Sem permissão para sinalizar digitação nesta conversa.');
        }

        if (ChatAccess::isBlockedBy($viewer->id, $peerUserId)) {
            abort(403, 'Não é possível usar o chat com este usuário no momento.');
        }

        if (ChatAccess::isBlockedBy($peerUserId, $viewer->id)) {
            return response()->json([
                'message' => 'Sinal de digitação ignorado.',
            ]);
        }

        $this->broadcastSafely(new ChatTypingUpdated([
            'conversation_id' => $conversation->id,
            'is_typing' => (bool) $validated['is_typing'],
            'user' => $this->transformUserPreview($viewer),
        ], $peerUserId));

        return response()->json([
            'message' => 'Sinal de digitação enviado.',
        ]);
    }

    public function removeConversation(ChatConversation $conversation): JsonResponse
    {
        $viewer = auth('api')->user();

        $this->ensureParticipant($viewer->id, $conversation);
        $conversationId = (int) $conversation->id;

        $attachmentPaths = ChatMessageAttachment::query()
            ->whereIn('message_id', function ($query) use ($conversationId): void {
                $query->select('id')
                    ->from('chat_messages')
                    ->where('conversation_id', $conversationId);
            })
            ->pluck('media_path')
            ->filter(static fn ($path): bool => is_string($path) && trim($path) !== '')
            ->values();

        DB::transaction(function () use ($conversation, $conversationId): void {
            $messageIds = ChatMessage::query()
                ->where('conversation_id', $conversationId)
                ->pluck('id');

            if ($messageIds->isNotEmpty()) {
                ChatMessageAttachment::query()
                    ->whereIn('message_id', $messageIds)
                    ->delete();
            }

            ChatMessage::query()
                ->where('conversation_id', $conversationId)
                ->delete();

            ChatConversationParticipant::query()
                ->where('conversation_id', $conversationId)
                ->delete();

            $conversation->delete();
        });

        if ($attachmentPaths->isNotEmpty()) {
            Storage::disk('local')->delete($attachmentPaths->all());
        }

        return response()->json([
            'message' => 'Conversa apagada com sucesso.',
        ]);
    }

    public function blockUser(User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($viewer->id === $user->id) {
            abort(422, 'Você não pode bloquear a própria conta.');
        }

        ChatUserBlock::query()->firstOrCreate([
            'blocker_user_id' => $viewer->id,
            'blocked_user_id' => $user->id,
        ]);

        $conversation = $this->findConversationBetween($viewer->id, $user->id);
        if ($conversation) {
            ChatConversationParticipant::query()
                ->where('conversation_id', $conversation->id)
                ->where('user_id', $viewer->id)
                ->update([
                    'hidden_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        return response()->json([
            'message' => 'Usuário bloqueado no chat.',
        ]);
    }

    public function unblockUser(User $user): JsonResponse
    {
        $viewer = auth('api')->user();

        if ($viewer->id === $user->id) {
            abort(422, 'Operação inválida para a própria conta.');
        }

        ChatUserBlock::query()
            ->where('blocker_user_id', $viewer->id)
            ->where('blocked_user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'Usuário desbloqueado no chat.',
        ]);
    }

    private function findOrCreateConversation(int $firstUserId, int $secondUserId): ChatConversation
    {
        [$userOneId, $userTwoId] = ChatConversation::canonicalPair($firstUserId, $secondUserId);

        $conversation = ChatConversation::query()->firstOrCreate([
            'user_one_id' => $userOneId,
            'user_two_id' => $userTwoId,
        ]);

        ChatConversationParticipant::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'user_id' => $userOneId,
        ]);

        ChatConversationParticipant::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'user_id' => $userTwoId,
        ]);

        return $conversation;
    }

    private function findConversationBetween(int $firstUserId, int $secondUserId): ?ChatConversation
    {
        [$userOneId, $userTwoId] = ChatConversation::canonicalPair($firstUserId, $secondUserId);

        return ChatConversation::query()
            ->where('user_one_id', $userOneId)
            ->where('user_two_id', $userTwoId)
            ->first();
    }

    private function ensureParticipant(int $userId, ChatConversation $conversation): ChatConversationParticipant
    {
        $participant = ChatConversationParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $userId)
            ->first();

        if (! $participant) {
            abort(403, 'Sem permissão para acessar esta conversa.');
        }

        return $participant;
    }

    private function resolvePeerUser(ChatConversation $conversation, int $viewerUserId): ?User
    {
        if ($conversation->user_one_id === $viewerUserId) {
            return $conversation->userTwo;
        }

        if ($conversation->user_two_id === $viewerUserId) {
            return $conversation->userOne;
        }

        return null;
    }

    /**
     * @param  Collection<int, int>  $conversationIds
     */
    private function markConversationsAsDelivered(int $viewerUserId, Collection $conversationIds): void
    {
        if ($conversationIds->isEmpty()) {
            return;
        }

        $blockedSenderIds = $this->blockedSenderIdsForViewer($viewerUserId);

        $messages = ChatMessage::query()
            ->whereIn('conversation_id', $conversationIds)
            ->where('recipient_user_id', $viewerUserId)
            ->whereNull('delivered_at')
            ->whereNull('deleted_at')
            ->when($blockedSenderIds !== [], fn ($query) => $query->whereNotIn('sender_user_id', $blockedSenderIds))
            ->get();

        if ($messages->isEmpty()) {
            return;
        }

        $now = now();

        foreach ($messages as $message) {
            $message->forceFill([
                'delivered_at' => $now,
            ])->save();

            $this->broadcastStatusUpdate($message);
        }
    }

    /**
     * @param  Collection<int, ChatMessage>  $messages
     */
    private function markMessagesDeliveredAndRead(int $viewerUserId, Collection $messages): void
    {
        if ($messages->isEmpty()) {
            return;
        }

        $incoming = $messages
            ->filter(fn (ChatMessage $message): bool => (int) $message->recipient_user_id === $viewerUserId)
            ->values();

        if ($incoming->isEmpty()) {
            return;
        }

        $now = now();

        foreach ($incoming as $message) {
            $hasChanges = false;

            if ($message->delivered_at === null) {
                $message->delivered_at = $now;
                $hasChanges = true;
            }

            if ($message->read_at === null) {
                $message->read_at = $now;
                $hasChanges = true;
            }

            if ($hasChanges) {
                $message->save();
                $this->broadcastStatusUpdate($message);
            }
        }

        $latestIncoming = $incoming->last();
        if ($latestIncoming) {
            ChatConversationParticipant::query()
                ->where('conversation_id', $latestIncoming->conversation_id)
                ->where('user_id', $viewerUserId)
                ->update([
                    'last_read_message_id' => $latestIncoming->id,
                    'last_seen_at' => $now,
                    'updated_at' => $now,
                ]);
        }
    }

    private function unreadCount(int $conversationId, int $viewerUserId): int
    {
        $blockedSenderIds = $this->blockedSenderIdsForViewer($viewerUserId);

        return ChatMessage::query()
            ->where('conversation_id', $conversationId)
            ->where('recipient_user_id', $viewerUserId)
            ->whereNull('read_at')
            ->when($blockedSenderIds !== [], fn ($query) => $query->whereNotIn('sender_user_id', $blockedSenderIds))
            ->count();
    }

    /**
     * @return array<int, int>
     */
    private function blockedSenderIdsForViewer(int $viewerUserId): array
    {
        return ChatUserBlock::query()
            ->where('blocker_user_id', $viewerUserId)
            ->pluck('blocked_user_id')
            ->map(static fn ($value): int => (int) $value)
            ->all();
    }

    private function broadcastStatusUpdate(ChatMessage $message): void
    {
        $this->broadcastSafely(new ChatMessageStatusUpdated([
            'conversation_id' => $message->conversation_id,
            'message_id' => $message->id,
            'delivered_at' => optional($message->delivered_at)->toIso8601String(),
            'read_at' => optional($message->read_at)->toIso8601String(),
        ], $message->sender_user_id));
    }

    /**
     * @return array<string, mixed>
     */
    private function transformMessage(ChatMessage $message, ?int $viewerUserId = null): array
    {
        $isDeleted = $message->deleted_at !== null;

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_user_id' => $message->sender_user_id,
            'recipient_user_id' => $message->recipient_user_id,
            'body' => $isDeleted ? null : $message->body,
            'is_deleted' => $isDeleted,
            'deleted_at' => optional($message->deleted_at)->toIso8601String(),
            'is_edited' => ! $isDeleted && $message->edited_at !== null,
            'edited_at' => optional($message->edited_at)->toIso8601String(),
            'delivered_at' => optional($message->delivered_at)->toIso8601String(),
            'read_at' => optional($message->read_at)->toIso8601String(),
            'created_at' => optional($message->created_at)->toIso8601String(),
            'updated_at' => optional($message->updated_at)->toIso8601String(),
            'status' => $viewerUserId ? $message->statusForViewer($viewerUserId) : null,
            'sender' => $message->relationLoaded('sender') ? $this->transformUserPreview($message->sender) : null,
            'attachments' => $isDeleted
                ? []
                : $message->attachments->map(fn (ChatMessageAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'media_path' => MediaAccess::signPath($attachment->media_path),
                    'media_type' => $attachment->media_type,
                    'mime' => $attachment->mime,
                    'original_name' => $attachment->original_name,
                    'size_bytes' => $attachment->size_bytes,
                ])->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformUserPreview(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'stage_name' => $user->stage_name,
            'username' => $user->username,
            'avatar_path' => $user->avatar_path,
            'is_private' => (bool) $user->is_private,
        ];
    }

    private function resolveAttachmentType(?string $mime): string
    {
        if (! is_string($mime) || trim($mime) === '') {
            return 'file';
        }

        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }

        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }

        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }

        return 'file';
    }

    private function normalizePeerAlias(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function broadcastSafely(object $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
