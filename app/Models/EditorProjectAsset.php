<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EditorProjectAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'asset_type',
        'label',
        'path',
        'disk',
        'mime',
        'size_bytes',
        'duration_ms',
        'video_width',
        'video_height',
        'fps',
        'sample_rate',
        'channels',
        'waveform_path',
        'thumbnail_path',
        'preview_frame_path',
        'metadata_json',
        'sort_order',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
            'fps' => 'float',
            'processed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(EditorProject::class, 'project_id');
    }
}
