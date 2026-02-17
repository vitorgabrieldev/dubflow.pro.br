<?php

namespace App\Events;

use App\Models\EditorProjectRender;
use App\Support\MediaAccess;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EditorProjectRenderUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly int $projectId,
        public readonly EditorProjectRender $render,
    ) {
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("editor.project.{$this->projectId}");
    }

    public function broadcastAs(): string
    {
        return 'editor.render.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'project_id' => $this->projectId,
            'render' => [
                'id' => $this->render->id,
                'status' => $this->render->status,
                'progress_percent' => (int) $this->render->progress_percent,
                'preset' => $this->render->preset,
                'output_mode' => $this->render->output_mode,
                'output_path' => MediaAccess::signPath($this->render->output_path),
                'output_size_bytes' => $this->render->output_size_bytes,
                'error_message' => $this->render->error_message,
                'started_at' => optional($this->render->started_at)->toIso8601String(),
                'finished_at' => optional($this->render->finished_at)->toIso8601String(),
                'created_at' => optional($this->render->created_at)->toIso8601String(),
            ],
        ];
    }
}
