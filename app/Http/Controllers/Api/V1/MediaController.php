<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function show(Request $request, string $path): StreamedResponse|\Illuminate\Http\Response
    {
        $normalizedPath = ltrim(urldecode($path), '/');

        if ($normalizedPath === '' || str_contains($normalizedPath, '..')) {
            abort(404, 'Arquivo não encontrado.');
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($normalizedPath)) {
            abort(404, 'Arquivo não encontrado.');
        }

        $absolutePath = $disk->path($normalizedPath);
        $size = filesize($absolutePath);

        if (! is_int($size) || $size <= 0) {
            abort(404, 'Arquivo inválido.');
        }

        $mimeType = $disk->mimeType($normalizedPath) ?: 'application/octet-stream';
        $start = 0;
        $end = $size - 1;
        $status = 200;

        $rangeHeader = $request->header('Range');
        if (is_string($rangeHeader) && $rangeHeader !== '') {
            $range = $this->parseRangeHeader($rangeHeader, $size);

            if (! $range) {
                return response('', 416, [
                    'Content-Range' => "bytes */{$size}",
                    'Accept-Ranges' => 'bytes',
                ]);
            }

            [$start, $end] = $range;
            $status = 206;
        }

        $length = $end - $start + 1;

        $headers = [
            'Content-Type' => $mimeType,
            'Content-Length' => (string) $length,
            'Accept-Ranges' => 'bytes',
            'Content-Disposition' => 'inline; filename="'.basename($normalizedPath).'"',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ];

        if ($status === 206) {
            $headers['Content-Range'] = "bytes {$start}-{$end}/{$size}";
        }

        if ($request->isMethod('HEAD')) {
            return response('', $status, $headers);
        }

        return response()->stream(function () use ($absolutePath, $start, $length): void {
            $handle = fopen($absolutePath, 'rb');
            if ($handle === false) {
                return;
            }

            try {
                fseek($handle, $start);
                $remaining = $length;

                while ($remaining > 0 && ! feof($handle)) {
                    $chunkSize = min(1024 * 1024, $remaining);
                    $chunk = fread($handle, $chunkSize);

                    if ($chunk === false || $chunk === '') {
                        break;
                    }

                    echo $chunk;
                    $remaining -= strlen($chunk);

                    if (ob_get_level() > 0) {
                        @ob_flush();
                    }

                    flush();
                }
            } finally {
                fclose($handle);
            }
        }, $status, $headers);
    }

    private function parseRangeHeader(string $rangeHeader, int $size): ?array
    {
        if (! preg_match('/bytes=(\d*)-(\d*)/i', $rangeHeader, $matches)) {
            return null;
        }

        $startRaw = $matches[1] ?? '';
        $endRaw = $matches[2] ?? '';

        if ($startRaw === '' && $endRaw === '') {
            return null;
        }

        if ($startRaw === '') {
            $suffixLength = (int) $endRaw;
            if ($suffixLength <= 0) {
                return null;
            }

            $start = max(0, $size - $suffixLength);
            $end = $size - 1;

            return [$start, $end];
        }

        $start = (int) $startRaw;
        $end = $endRaw === '' ? $size - 1 : (int) $endRaw;

        if ($start < 0 || $start >= $size || $end < $start) {
            return null;
        }

        $end = min($end, $size - 1);

        return [$start, $end];
    }
}

