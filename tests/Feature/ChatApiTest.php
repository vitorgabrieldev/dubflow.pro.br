<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\User;
use App\Notifications\ChatMessageReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_profile_requires_follow_to_start_chat(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create([
            'is_private' => true,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertStatus(403)
            ->assertJsonPath('message', 'Perfil privado: você precisa seguir este usuário para enviar mensagem.');

        $sender->followingUsers()->syncWithoutDetaching([$recipient->id]);

        $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertOk()
            ->assertJsonPath('conversation.peer.id', $recipient->id);
    }

    public function test_user_can_send_edit_and_delete_message_with_read_status_updates(): void
    {
        Notification::fake();

        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $conversationResponse = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/with/{$secondUser->id}")
            ->assertOk()
            ->json();

        $conversationId = (int) ($conversationResponse['conversation']['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $sendResponse = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Primeira mensagem do chat',
            ])
            ->assertCreated()
            ->json();

        Notification::assertSentTo($secondUser, ChatMessageReceived::class);

        $messageId = (int) ($sendResponse['message']['id'] ?? 0);
        $this->assertGreaterThan(0, $messageId);

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->getJson("/api/v1/chat/conversations/{$conversationId}/messages")
            ->assertOk()
            ->assertJsonPath('items.0.id', $messageId);

        $messageAfterRead = ChatMessage::query()->findOrFail($messageId);
        $this->assertNotNull($messageAfterRead->delivered_at);
        $this->assertNotNull($messageAfterRead->read_at);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->patchJson("/api/v1/chat/messages/{$messageId}", [
                'body' => 'Mensagem editada no chat',
            ])
            ->assertOk()
            ->assertJsonPath('message.is_edited', true);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->deleteJson("/api/v1/chat/messages/{$messageId}")
            ->assertOk()
            ->assertJsonPath('message.is_deleted', true);

        $this->assertDatabaseHas('chat_messages', [
            'id' => $messageId,
            'body' => null,
        ]);
    }

    public function test_blocked_user_messages_are_accepted_but_not_delivered_to_blocker(): void
    {
        Notification::fake();

        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $conversationResponse = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/with/{$secondUser->id}")
            ->assertOk()
            ->json();

        $conversationId = (int) ($conversationResponse['conversation']['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->postJson("/api/v1/chat/users/{$firstUser->id}/block")
            ->assertOk();

        $this->assertDatabaseHas('chat_user_blocks', [
            'blocker_user_id' => $secondUser->id,
            'blocked_user_id' => $firstUser->id,
        ]);

        $blockedSendPayload = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem bloqueada',
            ])
            ->assertCreated()
            ->json();

        Notification::assertNothingSent();

        $blockedMessageId = (int) ($blockedSendPayload['message']['id'] ?? 0);
        $this->assertGreaterThan(0, $blockedMessageId);

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->getJson("/api/v1/chat/conversations/{$conversationId}/messages")
            ->assertOk()
            ->assertJsonCount(0, 'items');

        $blockedMessage = ChatMessage::query()->findOrFail($blockedMessageId);
        $this->assertNull($blockedMessage->delivered_at);
        $this->assertNull($blockedMessage->read_at);

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->deleteJson("/api/v1/chat/users/{$firstUser->id}/block")
            ->assertOk();

        $this->assertDatabaseMissing('chat_user_blocks', [
            'blocker_user_id' => $secondUser->id,
            'blocked_user_id' => $firstUser->id,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem permitida novamente',
            ])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->getJson("/api/v1/chat/conversations/{$conversationId}/messages")
            ->assertOk()
            ->assertJsonCount(2, 'items');
    }

    public function test_blocked_user_cannot_send_attachments_while_blocked(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->postJson("/api/v1/chat/users/{$sender->id}/block")
            ->assertOk();

        $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->post("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Tentando enviar arquivo',
                'attachments' => [
                    UploadedFile::fake()->image('chat.jpg'),
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Envio de anexos indisponível enquanto este usuário mantém você bloqueado.');

        $this->assertDatabaseMissing('chat_messages', [
            'conversation_id' => $conversationId,
            'sender_user_id' => $sender->id,
            'body' => 'Tentando enviar arquivo',
        ]);
    }

    public function test_blocked_user_hits_pending_message_limit_when_blocked(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->postJson("/api/v1/chat/users/{$sender->id}/block")
            ->assertOk();

        $baseTimestamp = now();
        $rows = [];
        for ($index = 0; $index < 120; $index++) {
            $rows[] = [
                'conversation_id' => $conversationId,
                'sender_user_id' => $sender->id,
                'recipient_user_id' => $recipient->id,
                'body' => "Mensagem pendente {$index}",
                'edited_at' => null,
                'deleted_at' => null,
                'delivered_at' => null,
                'read_at' => null,
                'created_at' => $baseTimestamp,
                'updated_at' => $baseTimestamp,
            ];
        }
        ChatMessage::query()->insert($rows);

        $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem 121',
            ])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Limite de mensagens pendentes atingido nesta conversa bloqueada.');
    }

    public function test_conversations_endpoint_returns_paginated_payload(): void
    {
        $viewer = User::factory()->create();
        $peers = User::factory()->count(6)->create();

        foreach ($peers as $peer) {
            $this->withHeaders($this->authHeaders($this->issueToken($viewer)))
                ->postJson("/api/v1/chat/conversations/with/{$peer->id}")
                ->assertOk();
        }

        $this->withHeaders($this->authHeaders($this->issueToken($viewer)))
            ->getJson('/api/v1/chat/conversations?per_page=3&page=1')
            ->assertOk()
            ->assertJsonCount(3, 'items')
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.per_page', 3)
            ->assertJsonPath('pagination.total', 6)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.has_more', true);
    }

    public function test_remove_conversation_hard_deletes_messages_for_both_participants(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/with/{$secondUser->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem inicial',
            ])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->deleteJson("/api/v1/chat/conversations/{$conversationId}")
            ->assertOk();

        $this->assertDatabaseMissing('chat_conversations', [
            'id' => $conversationId,
        ]);
        $this->assertDatabaseMissing('chat_messages', [
            'conversation_id' => $conversationId,
        ]);
        $this->assertDatabaseMissing('chat_conversation_participants', [
            'conversation_id' => $conversationId,
        ]);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->getJson('/api/v1/chat/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'items');

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem após exclusão permanente',
            ])
            ->assertNotFound();

        $restartConversation = $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->postJson("/api/v1/chat/conversations/with/{$firstUser->id}")
            ->assertOk()
            ->json('conversation');

        $newConversationId = (int) ($restartConversation['id'] ?? 0);
        $this->assertGreaterThan(0, $newConversationId);
        $this->assertNotSame($conversationId, $newConversationId);
    }

    public function test_mark_conversation_read_marks_pending_messages_as_read(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $sendPayload = $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem para leitura',
            ])
            ->assertCreated()
            ->json('message');

        $messageId = (int) ($sendPayload['id'] ?? 0);
        $this->assertGreaterThan(0, $messageId);

        $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->getJson('/api/v1/chat/conversations')
            ->assertOk()
            ->assertJsonPath('items.0.unread_count', 1);

        $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/read")
            ->assertOk()
            ->assertJsonPath('unread_count', 0);

        $message = ChatMessage::query()->findOrFail($messageId);
        $this->assertNotNull($message->delivered_at);
        $this->assertNotNull($message->read_at);
    }

    public function test_messages_endpoint_supports_before_id_cursor_pagination(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($sender)))
            ->postJson("/api/v1/chat/conversations/with/{$recipient->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        foreach (['Mensagem 1', 'Mensagem 2', 'Mensagem 3'] as $body) {
            $this->withHeaders($this->authHeaders($this->issueToken($sender)))
                ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                    'body' => $body,
                ])
                ->assertCreated();
        }

        $firstPage = $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->getJson("/api/v1/chat/conversations/{$conversationId}/messages?per_page=2")
            ->assertOk()
            ->json();

        $this->assertTrue((bool) ($firstPage['has_more'] ?? false));
        $this->assertSame('Mensagem 2', (string) ($firstPage['items'][0]['body'] ?? null));
        $this->assertSame('Mensagem 3', (string) ($firstPage['items'][1]['body'] ?? null));
        $this->assertNotNull($firstPage['next_before_id'] ?? null);

        $cursor = (int) $firstPage['next_before_id'];
        $secondPage = $this->withHeaders($this->authHeaders($this->issueToken($recipient)))
            ->getJson("/api/v1/chat/conversations/{$conversationId}/messages?per_page=2&before_id={$cursor}")
            ->assertOk()
            ->json();

        $this->assertFalse((bool) ($secondPage['has_more'] ?? true));
        $this->assertCount(1, $secondPage['items'] ?? []);
        $this->assertSame('Mensagem 1', (string) ($secondPage['items'][0]['body'] ?? null));
    }

    public function test_typing_endpoint_handles_blocking_rules(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/with/{$secondUser->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);
        $this->assertGreaterThan(0, $conversationId);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/typing", [
                'is_typing' => true,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Sinal de digitação enviado.');

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/users/{$secondUser->id}/block")
            ->assertOk();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/typing", [
                'is_typing' => true,
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Não é possível usar o chat com este usuário no momento.');

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->deleteJson("/api/v1/chat/users/{$secondUser->id}/block")
            ->assertOk();

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->postJson("/api/v1/chat/users/{$firstUser->id}/block")
            ->assertOk();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/typing", [
                'is_typing' => true,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Sinal de digitação ignorado.');
    }

    /**
     * @return array<string, string>
     */
    private function authHeaders(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];
    }

    private function issueToken(User $user): string
    {
        return auth('api')->login($user);
    }
}
