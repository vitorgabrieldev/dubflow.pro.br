<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DubbingTestCharacter extends Model
{
    use HasFactory;

    protected $fillable = [
        'dubbing_test_id',
        'name',
        'description',
        'expectations',
        'appearance_estimate',
        'position',
    ];

    public function dubbingTest(): BelongsTo
    {
        return $this->belongsTo(DubbingTest::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(DubbingTestSubmission::class, 'character_id');
    }
}
