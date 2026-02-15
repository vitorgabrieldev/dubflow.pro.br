<?php

namespace Tests\Feature;

use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Notifications\OrganizationMemberInvited;
use App\Notifications\OrganizationPublishedPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_notifications_and_unread_count(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Notification Org',
            'slug' => 'notification-org',
            'is_public' => true,
        ]);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $post = DubbingPost::create([
            'organization_id' => $organization->id,
            'author_user_id' => $owner->id,
            'title' => 'Episódio Notificação',
            'media_path' => 'dubbing-media/notify.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
            'published_at' => now(),
        ]);

        $recipient->notify(new OrganizationPublishedPost($post));

        $token = auth('api')->login($recipient);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('items.data.0.data.type', 'organization_published_post');
    }

    public function test_user_can_mark_single_notification_as_read_and_mark_all_read(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Read Org',
            'slug' => 'read-org',
            'is_public' => true,
        ]);

        $post = DubbingPost::create([
            'organization_id' => $organization->id,
            'author_user_id' => $owner->id,
            'title' => 'Episódio Read',
            'media_path' => 'dubbing-media/read.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
            'published_at' => now(),
        ]);

        $recipient->notify(new OrganizationPublishedPost($post));
        $recipient->notify(new OrganizationPublishedPost($post));

        $firstNotificationId = (string) $recipient->notifications()->latest()->first()?->id;
        $this->assertNotEmpty($firstNotificationId);

        $token = auth('api')->login($recipient);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/notifications/{$firstNotificationId}/read")
            ->assertOk();

        $this->assertNotNull($recipient->notifications()->where('id', $firstNotificationId)->first()?->read_at);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/notifications/read-all')
            ->assertOk();

        $this->assertSame(0, $recipient->fresh()->unreadNotifications()->count());
    }

    public function test_user_can_mark_invite_as_accepted_and_clear_or_delete_notifications(): void
    {
        $owner = User::factory()->create();
        $inviter = User::factory()->create();
        $recipient = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Invite Notification Org',
            'slug' => 'invite-notification-org',
            'is_public' => true,
        ]);

        $recipient->notify(new OrganizationMemberInvited($organization, $inviter, 'editor'));
        $recipient->notify(new OrganizationMemberInvited($organization, $inviter, 'member'));

        $notifications = $recipient->notifications()->latest()->get();
        $inviteNotificationId = (string) $notifications->first()?->id;
        $otherNotificationId = (string) $notifications->last()?->id;
        $this->assertNotEmpty($inviteNotificationId);
        $this->assertNotEmpty($otherNotificationId);

        $token = auth('api')->login($recipient);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/notifications/{$inviteNotificationId}/invite-accepted")
            ->assertOk();

        $updated = $recipient->notifications()->where('id', $inviteNotificationId)->firstOrFail();
        $this->assertSame('accepted', $updated->data['invite_status'] ?? null);
        $this->assertNotNull($updated->read_at);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->deleteJson("/api/v1/notifications/{$otherNotificationId}")
            ->assertOk();

        $this->assertDatabaseMissing('notifications', [
            'id' => $otherNotificationId,
            'notifiable_id' => $recipient->id,
        ]);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->deleteJson('/api/v1/notifications/clear')
            ->assertOk();

        $this->assertSame(0, $recipient->fresh()->notifications()->count());
    }

    public function test_mark_invite_accepted_rejects_non_invite_notification(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create();

        $organization = Organization::create([
            'owner_user_id' => $owner->id,
            'name' => 'Non Invite Notification Org',
            'slug' => 'non-invite-notification-org',
            'is_public' => true,
        ]);

        $post = DubbingPost::create([
            'organization_id' => $organization->id,
            'author_user_id' => $owner->id,
            'title' => 'Post sem convite',
            'media_path' => 'dubbing-media/non-invite.mp3',
            'media_type' => 'audio',
            'language_code' => 'pt-BR',
            'published_at' => now(),
        ]);

        $recipient->notify(new OrganizationPublishedPost($post));
        $notificationId = (string) $recipient->notifications()->latest()->value('id');

        $token = auth('api')->login($recipient);

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])->postJson("/api/v1/notifications/{$notificationId}/invite-accepted")
            ->assertStatus(422);
    }
}

