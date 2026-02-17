<?php

namespace App\Events;

use App\Models\EditorProjectAsset;
use App\Support\MediaAccess;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EditorProjectAssetUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly int $projectId,
        public readonly EditorProjectAsset $asset,
    ) {
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("editor.project.{$this->projectId}");
    }

    public function broadcastAs(): string
    {
        return 'editor.asset.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'project_id' => $this->projectId,
            'asset' => [
                'id' => $this->asset->id,
                'asset_type' => $this->asset->asset_type,
                'label' => $this->asset->label,
                'path' => MediaAccess::signPath($this->asset->path),
                'mime' => $this->asset->mime,
                'size_bytes' => (int) $this->asset->size_bytes,
                'duration_ms' => $this->asset->duration_ms,
                'video_width' => $this->asset->video_width,
                'video_height' => $this->asset->video_height,
                'fps' => $this->asset->fps,
                'sample_rate' => $this->asset->sample_rate,
                'channels' => $this->asset->channels,
                'waveform_path' => MediaAccess::signPath($this->asset->waveform_path),
                'thumbnail_path' => MediaAccess::signPath($this->asset->thumbnail_path),
                'preview_frame_path' => MediaAccess::signPath($this->asset->preview_frame_path),
                'processed_at' => optional($this->asset->processed_at)->toIso8601String(),
            ],
        ];
    }
}
