<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class Log extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'user_id',
        'log_type',
        'log_id',
        'log_name',
        'message',
        'action',
        'old_data',
        'new_data',
        'ip',
        'user_agent',
        'url',
        'method',
    ];

    protected function casts(): array
    {
        return [
            'old_data' => 'array',
            'new_data' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Log $log): void {
            if (empty($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }

            if (is_string($log->log_name)) {
                $log->log_name = Str::limit($log->log_name, 191, '...');
            }

            if (is_string($log->message)) {
                $log->message = Str::limit($log->message, 191, '...');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function log(): MorphTo
    {
        return $this->morphTo('log');
    }
}
