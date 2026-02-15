<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DubbingTestMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'dubbing_test_id',
        'media_path',
        'media_type',
        'disk',
        'size_bytes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function dubbingTest(): BelongsTo
    {
        return $this->belongsTo(DubbingTest::class);
    }
}
