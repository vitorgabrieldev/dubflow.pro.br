<?php

namespace App\Http\Controllers\Api\V1\Admin;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function download(string $file): StreamedResponse|Response
    {
        $relativePath = $this->decodeFilePath($file);

        if (! $relativePath || ! str_starts_with($relativePath, 'exports/admin/')) {
            abort(404, 'Arquivo não encontrado.');
        }

        $disk = Storage::disk('local');

        if (! $disk->exists($relativePath)) {
            abort(404, 'Arquivo não encontrado.');
        }

        $stream = $disk->readStream($relativePath);

        if ($stream === false) {
            return response('Falha ao abrir o arquivo de exportação.', 500);
        }

        $downloadName = basename($relativePath);

        return response()->streamDownload(
            function () use ($stream): void {
                try {
                    fpassthru($stream);
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
            },
            $downloadName,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]
        );
    }

    private function decodeFilePath(string $encodedPath): ?string
    {
        $base64 = strtr($encodedPath, '-_', '+/');
        $padding = strlen($base64) % 4;

        if ($padding !== 0) {
            $base64 .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($base64, true);

        if (! is_string($decoded) || $decoded === '') {
            return null;
        }

        $normalized = ltrim($decoded, '/');

        if (str_contains($normalized, '..')) {
            return null;
        }

        return $normalized;
    }
}
