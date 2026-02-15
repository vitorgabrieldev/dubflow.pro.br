<?php

namespace App\Support;

use App\Models\DubbingPost;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\URL;

class MediaAccess
{
    /**
     * @var array<int, string>
     */
    private const PROTECTED_PREFIXES = [
        'dubbing-media/',
        'dubbing-thumbnails/',
        'dubbing-tests/',
    ];

    public static function isProtectedPath(?string $path): bool
    {
        if (! is_string($path) || trim($path) === '') {
            return false;
        }

        if (self::isAbsoluteUrl($path)) {
            return false;
        }

        $normalized = ltrim($path, '/');

        foreach (self::PROTECTED_PREFIXES as $prefix) {
            if (str_starts_with($normalized, $prefix)) {
                return true;
            }
        }

        return false;
    }

    public static function signPath(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return $path;
        }

        if (! self::isProtectedPath($path)) {
            return $path;
        }

        $normalized = ltrim($path, '/');
        $ttlMinutes = max(1, (int) config('app.media_url_ttl_minutes', 30));

        return URL::temporarySignedRoute(
            'api.v1.media.show',
            now()->addMinutes($ttlMinutes),
            ['path' => $normalized]
        );
    }

    /**
     * @param  Collection<int, DubbingPost>  $posts
     */
    public static function signPostCollection(Collection $posts): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $posts->each(static function (DubbingPost $post): void {
            self::signPost($post);
        });
    }

    public static function signPost(DubbingPost $post): void
    {
        $mediaPath = self::signPath($post->media_path);
        if ($mediaPath !== null) {
            $post->setAttribute('media_path', $mediaPath);
        }

        $thumbnailPath = self::signPath($post->thumbnail_path);
        if ($thumbnailPath !== null) {
            $post->setAttribute('thumbnail_path', $thumbnailPath);
        }

        $metadata = is_array($post->metadata) ? $post->metadata : [];
        $assets = $metadata['assets'] ?? null;

        if (! is_array($assets)) {
            return;
        }

        foreach ($assets as $index => $asset) {
            if (! is_array($asset)) {
                continue;
            }

            $assetPath = $asset['path'] ?? null;
            if (! is_string($assetPath) || trim($assetPath) === '') {
                continue;
            }

            $metadata['assets'][$index]['path'] = self::signPath($assetPath);
        }

        $post->setAttribute('metadata', $metadata);
    }

    public static function signNotificationImagePath(?string $imagePath): ?string
    {
        return self::signPath($imagePath);
    }

    private static function isAbsoluteUrl(string $value): bool
    {
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }
}
