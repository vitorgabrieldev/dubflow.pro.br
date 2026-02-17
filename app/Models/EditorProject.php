<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EditorProject extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'owner_user_id',
        'title',
        'description',
        'source_language',
        'target_language',
        'status',
        'timeline_json',
        'storage_bytes',
        'duration_ms',
        'autosaved_at',
        'rendered_at',
        'source_assets_purged_at',
    ];

    protected function casts(): array
    {
        return [
            'timeline_json' => 'array',
            'autosaved_at' => 'datetime',
            'rendered_at' => 'datetime',
            'source_assets_purged_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(EditorProjectAsset::class, 'project_id')->orderBy('sort_order');
    }

    public function subtitles(): HasMany
    {
        return $this->hasMany(EditorProjectSubtitle::class, 'project_id')->orderBy('sort_order');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(EditorProjectComment::class, 'project_id')->latest('created_at');
    }

    public function renders(): HasMany
    {
        return $this->hasMany(EditorProjectRender::class, 'project_id')->latest('created_at');
    }

    public function events(): HasMany
    {
        return $this->hasMany(EditorProjectEvent::class, 'project_id')->latest('created_at');
    }
}
