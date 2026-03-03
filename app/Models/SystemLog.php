<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class SystemLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'user_type',
        'user_id',
        'message',
        'level',
        'context',
        'ip',
        'user_agent',
        'url',
        'method',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (SystemLog $log): void {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): MorphTo
    {
        return $this->morphTo('user');
    }

    public function getColor(): string
    {
        return match (strtoupper((string) $this->level)) {
            'INFO' => '#1a73d1',
            'NOTICE' => '#50a756',
            'WARNING' => '#ff900f',
            'ERROR' => '#ff5720',
            'CRITICAL' => '#f34336',
            'ALERT' => '#d92c3f',
            'EMERGENCY' => '#b31f1b',
            default => '#8a8a8a',
        };
    }
}
