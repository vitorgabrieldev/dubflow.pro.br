<?php

$normalizeOrigin = static function (?string $origin): ?string {
    $origin = trim((string) $origin);

    if ($origin === '') {
        return null;
    }

    if (! str_contains($origin, '://')) {
        return rtrim($origin, '/');
    }

    $parts = parse_url($origin);

    if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return rtrim($origin, '/');
    }

    $normalized = strtolower((string) $parts['scheme']).'://'.strtolower((string) $parts['host']);

    if (! empty($parts['port'])) {
        $normalized .= ':'.(int) $parts['port'];
    }

    return $normalized;
};

$explodeCsv = static function (string $value): array {
    if ($value === '') {
        return [];
    }

    return array_values(array_filter(array_map('trim', explode(',', $value)), static fn (string $item): bool => $item !== ''));
};

$defaultOrigins = [
    env('APP_FRONTEND_URL', env('FRONTEND_URL')),
    env('ADMIN_FRONTEND_URL'),
    env('APP_URL'),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://dubflow.pro.br',
    'https://www.dubflow.pro.br',
    'https://admin.dubflow.pro.br',
];

$envOrigins = $explodeCsv((string) env('CORS_ALLOWED_ORIGINS', ''));
$allowedOrigins = array_values(array_unique(array_filter(array_map($normalizeOrigin, array_merge($defaultOrigins, $envOrigins)))));
$allowedOriginPatterns = $explodeCsv((string) env('CORS_ALLOWED_ORIGINS_PATTERNS', ''));
$allowedPaths = $explodeCsv((string) env('CORS_PATHS', 'api/*,broadcasting/auth,sanctum/csrf-cookie'));
$exposedHeaders = $explodeCsv((string) env('CORS_EXPOSED_HEADERS', ''));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => $allowedPaths,

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => $allowedOriginPatterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => $exposedHeaders,

    'max_age' => (int) env('CORS_MAX_AGE', 600),

    'supports_credentials' => (bool) env('CORS_SUPPORTS_CREDENTIALS', true),

];
