<?php

return [
    'ffmpeg_bin' => env('EDITOR_FFMPEG_BIN', 'ffmpeg'),
    'ffprobe_bin' => env('EDITOR_FFPROBE_BIN', 'ffprobe'),
    'max_project_size_bytes' => 5 * 1024 * 1024 * 1024, // 5 GB
    'max_asset_size_kb' => 2 * 1024 * 1024, // 2 GB
    'allowed_video_mimes' => [
        'video/mp4',
        'video/quicktime',
        'video/x-matroska',
        'video/webm',
    ],
    'allowed_audio_mimes' => [
        'audio/mpeg',
        'audio/wav',
        'audio/x-wav',
        'audio/flac',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
        'audio/webm',
    ],
    'allowed_subtitle_mimes' => [
        'application/x-subrip',
        'text/vtt',
        'text/plain',
        'application/octet-stream',
    ],
    'allowed_image_mimes' => [
        'image/jpeg',
        'image/png',
        'image/webp',
    ],
];
