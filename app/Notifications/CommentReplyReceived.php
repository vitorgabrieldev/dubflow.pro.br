<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\DubbingPost;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CommentReplyReceived extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingPost $post,
        private readonly Comment $parentComment,
        private readonly Comment $replyComment,
        private readonly string $replyAuthorName,
    ) {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'comment_reply_received',
            'title' => 'Responderam seu comentário',
            'message' => $this->replyAuthorName.' respondeu seu comentário em "'.$this->post->title.'".',
            'icon' => 'message-circle',
            'image' => $this->post->thumbnail_path,
            'click_action' => '/post/'.$this->post->id,
            'meta' => [
                'post_id' => $this->post->id,
                'organization_id' => $this->post->organization_id,
                'parent_comment_id' => $this->parentComment->id,
                'reply_comment_id' => $this->replyComment->id,
            ],
        ];
    }
}

