<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DubbingTest extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'created_by_user_id',
        'title',
        'description',
        'visibility',
        'status',
        'starts_at',
        'ends_at',
        'results_release_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'results_release_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(DubbingTestMedia::class)->orderBy('sort_order');
    }

    public function characters(): HasMany
    {
        return $this->hasMany(DubbingTestCharacter::class)->orderBy('position');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(DubbingTestSubmission::class);
    }
}
