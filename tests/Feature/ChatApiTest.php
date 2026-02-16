<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\User;
use App\Notifications\ChatMessageReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_removed_sidebar_conversation_returns_after_new_message(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $conversation = $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/with/{$secondUser->id}")
            ->assertOk()
            ->json('conversation');

        $conversationId = (int) ($conversation['id'] ?? 0);

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem inicial',
            ])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->deleteJson("/api/v1/chat/conversations/{$conversationId}")
            ->assertOk();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->getJson('/api/v1/chat/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'items');

        $this->withHeaders($this->authHeaders($this->issueToken($secondUser)))
            ->postJson("/api/v1/chat/conversations/{$conversationId}/messages", [
                'body' => 'Mensagem que reabre a conversa',
            ])
            ->assertCreated();

        $this->withHeaders($this->authHeaders($this->issueToken($firstUser)))
            ->getJson('/api/v1/chat/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.id', $conversationId);
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
