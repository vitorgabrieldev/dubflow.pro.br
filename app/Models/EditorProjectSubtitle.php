<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EditorProjectSubtitle extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'language_code',
        'start_ms',
        'end_ms',
        'text',
        'style_json',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'style_json' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(EditorProject::class, 'project_id');
    }
}
