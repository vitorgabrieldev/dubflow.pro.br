<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/admin/{path?}', function (Request $request, ?string $path = null) {
    $adminFrontend = rtrim((string) config('app.admin_frontend_url', 'http://127.0.0.1:5174/admin'), '/');

    if (app()->environment('local')) {
        if ($adminFrontend === '') {
            abort(500, 'ADMIN_FRONTEND_URL não configurada.');
        }

        if (! str_starts_with($adminFrontend, 'http://') && ! str_starts_with($adminFrontend, 'https://')) {
            $adminFrontend = 'http://'.$adminFrontend;
        }

        $target = $adminFrontend;
        $normalizedPath = trim((string) $path, '/');
        if ($normalizedPath !== '') {
            $target .= '/'.$normalizedPath;
        }

        $query = $request->getQueryString();
        if ($query) {
            $target .= '?'.$query;
        }

        return redirect()->away($target);
    }

    $indexFile = public_path('admin/index.html');
    abort_unless(is_file($indexFile), 404);

    return response()->file($indexFile);
})->where('path', '.*');

Route::get('/', function (Request $request) {
    $supported = ['pt-BR', 'en', 'es', 'ja', 'fr'];
    $normalized = array_combine(
        array_map(fn ($locale) => strtolower($locale), $supported),
        $supported
    );

    $resolved = 'pt-BR';
    $header = strtolower((string) $request->header('accept-language', ''));

    foreach (explode(',', $header) as $part) {
        $tag = trim(explode(';', $part)[0] ?? '');
        if ($tag === '') {
            continue;
        }

        if (isset($normalized[$tag])) {
            $resolved = $normalized[$tag];
            break;
        }

        $language = explode('-', $tag)[0] ?? '';
        $fallback = collect($supported)->first(fn ($locale) => strtolower($locale) === $language || str_starts_with(strtolower($locale), $language.'-'));
        if ($fallback) {
            $resolved = $fallback;
            break;
        }
    }

    $frontendBase = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
    if ($frontendBase === '') {
        $frontendBase = 'http://localhost:3000';
    }

    if (! str_starts_with($frontendBase, 'http://') && ! str_starts_with($frontendBase, 'https://')) {
        $frontendBase = 'https://'.$frontendBase;
    }

    return redirect()->away("{$frontendBase}/{$resolved}");
});
