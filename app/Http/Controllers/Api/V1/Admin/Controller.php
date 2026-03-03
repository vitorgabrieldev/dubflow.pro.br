<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller as BaseController;
use App\Models\Log;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Controller extends BaseController
{
    protected int $defaultLimit = 20;

    protected int $maxLimit = 100;

    /**
     * @param  array<int, string>  $sortable
     * @return array<int, array{name: string, sort: string}>
     *
     * @throws ValidationException
     */
    protected function parseOrderBy(?string $orderBy, array $sortable, string $defaultField = 'id', string $defaultSort = 'desc'): array
    {
        if (empty($orderBy)) {
            return [
                [
                    'name' => $defaultField,
                    'sort' => strtolower($defaultSort) === 'asc' ? 'asc' : 'desc',
                ],
            ];
        }

        $parsed = [];

        foreach (explode('|', $orderBy) as $item) {
            [$field, $sort] = array_pad(explode(':', $item, 2), 2, null);
            $field = trim((string) $field);

            if ($field === '' || ! in_array($field, $sortable, true)) {
                throw ValidationException::withMessages([
                    'orderBy' => sprintf('Campo de ordenação inválido: %s', $field !== '' ? $field : '[vazio]'),
                ]);
            }

            $parsed[] = [
                'name' => $field,
                'sort' => strtolower((string) $sort) === 'asc' ? 'asc' : 'desc',
            ];
        }

        return $parsed;
    }

    protected function resolveLimit(?int $limit): int
    {
        $normalized = (int) ($limit ?: $this->defaultLimit);

        if ($normalized <= 0) {
            return $this->defaultLimit;
        }

        return min($normalized, $this->maxLimit);
    }

    /**
     * @param  array<int, string>  $searchable
     */
    protected function applySearch(Builder $query, ?string $search, array $searchable): void
    {
        if (! $search || empty($searchable)) {
            return;
        }

        $query->where(function (Builder $builder) use ($search, $searchable): void {
            foreach ($searchable as $column) {
                $builder->orWhere($column, 'like', '%'.$search.'%');
            }
        });
    }

    /**
     * @return array{start: ?Carbon, end: ?Carbon}
     */
    protected function parseDateRange(Request $request, string $field = 'created_at'): array
    {
        $start = $request->has($field.'.0')
            ? Carbon::parse((string) $request->input($field.'.0'))->setTimezone('UTC')
            : null;

        $end = $request->has($field.'.1')
            ? Carbon::parse((string) $request->input($field.'.1'))->setTimezone('UTC')
            : null;

        return ['start' => $start, 'end' => $end];
    }

    protected function applyDateRange(Builder $query, ?Carbon $start, ?Carbon $end, string $field = 'created_at'): void
    {
        if ($start) {
            $query->where($field, '>=', $start);
        }

        if ($end) {
            $query->where($field, '<=', $end);
        }
    }

    protected function currentUser(): ?User
    {
        return auth('api')->user();
    }

    protected function logAction(string $action, ?string $itemName, string $message, mixed $item = null, mixed $oldData = null): void
    {
        $request = request();
        $user = $this->currentUser();

        if (! $user) {
            return;
        }

        try {
            $queryString = $request->getQueryString();

            $log = new Log([
                'uuid' => (string) Str::uuid(),
                'log_name' => $itemName,
                'message' => $message,
                'action' => $action,
                'old_data' => $oldData,
                'new_data' => $item,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'url' => urldecode($request->getPathInfo().($queryString ? '?'.$queryString : '')),
                'method' => $request->getMethod(),
            ]);

            if ($item instanceof Model) {
                $log->log()->associate($item);
            }

            $log->user()->associate($user);
            $log->save();
        } catch (\Throwable) {
            // Intencionalmente silencioso para não bloquear o fluxo principal.
        }
    }

    /**
     * @param  array<int, array{name: string, value: string|callable(mixed): mixed, format?: string}>  $columns
     */
    protected function exportAsCsv(array $columns, Collection $items, string $prefix, string $logMessage): JsonResponse
    {
        $disk = Storage::disk('local');
        $disk->makeDirectory('exports/admin');

        $fileName = Str::slug($prefix).'-'.now()->format('Ymd-His').'-'.Str::lower(Str::random(8)).'.csv';
        $relativePath = 'exports/admin/'.$fileName;
        $absolutePath = $disk->path($relativePath);

        $handle = fopen($absolutePath, 'wb');
        if ($handle === false) {
            return response()->json([
                'message' => 'Falha ao gerar arquivo de exportação.',
            ], 500);
        }

        fputcsv($handle, array_map(static fn (array $column): string => $column['name'], $columns), ';');

        foreach ($items as $item) {
            $row = [];

            foreach ($columns as $column) {
                $valueResolver = $column['value'];
                $value = is_callable($valueResolver)
                    ? $valueResolver($item)
                    : data_get($item, $valueResolver);

                if (isset($column['format']) && $column['format'] === 'datetime') {
                    $value = $value ? Carbon::parse((string) $value)->format('d/m/Y H:i:s') : null;
                }

                if (is_array($value) || is_object($value)) {
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }

                $row[] = $value;
            }

            fputcsv($handle, $row, ';');
        }

        fclose($handle);

        $this->logAction('export', null, $logMessage, ['total_items' => $items->count()]);

        $encodedFile = rtrim(strtr(base64_encode($relativePath), '+/', '-_'), '=');
        $expiresAt = now()->addMinutes(max(1, (int) config('app.admin_export_url_ttl_minutes', 10)));
        $downloadUrl = URL::temporarySignedRoute('api.v1.admin.exports.download', $expiresAt, [
            'file' => $encodedFile,
        ]);

        return response()->json([
            'file_url' => $downloadUrl,
            'expires_at' => $expiresAt->toAtomString(),
        ]);
    }
}
