<?php

namespace App\Notifications;

use App\Models\DubbingTestSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DubbingTestResultReleased extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DubbingTestSubmission $submission,
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
        $test = $this->submission->dubbingTest;
        $character = $this->submission->character;
        $status = $this->submission->status;
        $feedback = trim((string) ($this->submission->rejection_feedback ?? ''));

        $message = match ($status) {
            'approved' => 'Você foi aprovado(a) para '.$character->name.' em '.$test->title.'.',
            'reserve' => 'Você entrou na reserva para '.$character->name.' em '.$test->title.'.',
            'rejected' => $feedback !== ''
                ? 'Você não foi selecionado(a) para '.$character->name.' em '.$test->title.'. Feedback: '.$feedback
                : 'Você não foi selecionado(a) para '.$character->name.' em '.$test->title.'.',
            default => 'Seu resultado para '.$character->name.' em '.$test->title.' foi atualizado.',
        };

        $icon = match ($status) {
            'approved' => 'badge-check',
            'reserve' => 'clock3',
            'rejected' => 'x-circle',
            default => 'info',
        };

        return [
            'type' => 'dubbing_test_result_released',
            'title' => 'Resultado de teste de dublagem',
            'message' => $message,
            'icon' => $icon,
            'image' => $test->organization?->avatar_path,
            'click_action' => null,
            'meta' => [
                'submission_id' => $this->submission->id,
                'dubbing_test_id' => $test->id,
                'character_id' => $character->id,
                'status' => $status,
                'rejection_feedback' => $this->submission->rejection_feedback,
                'organization_id' => $test->organization_id,
                'organization_slug' => $test->organization?->slug,
            ],
        ];
    }
}
