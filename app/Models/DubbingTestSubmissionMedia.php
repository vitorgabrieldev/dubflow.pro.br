<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DubbingTestSubmissionMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'media_path',
        'media_type',
        'disk',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(DubbingTestSubmission::class, 'submission_id');
    }
}
