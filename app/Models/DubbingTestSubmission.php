<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DubbingTestSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'dubbing_test_id',
        'character_id',
        'user_id',
        'cover_letter',
        'status',
        'reviewed_by_user_id',
        'reviewed_at',
        'visible_to_candidate_at',
        'results_notified_at',
        'rejection_feedback',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'visible_to_candidate_at' => 'datetime',
            'results_notified_at' => 'datetime',
        ];
    }

    public function dubbingTest(): BelongsTo
    {
        return $this->belongsTo(DubbingTest::class);
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(DubbingTestCharacter::class, 'character_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(DubbingTestSubmissionMedia::class, 'submission_id');
    }
}
