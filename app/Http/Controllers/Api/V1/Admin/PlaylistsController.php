<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\PlaylistResource;
use App\Models\Organization;
use App\Models\Playlist;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlaylistsController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'organization_id',
        'title',
        'slug',
        'visibility',
        'release_year',
        'created_at',
        'updated_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'id',
        'title',
        'slug',
        'description',
        'work_title',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,internal'],
            'release_year' => ['sometimes', 'nullable', 'integer', 'min:1900', 'max:2100'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return PlaylistResource::collection($items);
    }

    public function show(string $playlistId): PlaylistResource
    {
        $playlist = $this->findPlaylistById($playlistId, true);
        $playlist->load('organization:id,name,slug')->loadCount(['posts', 'seasons']);

        return new PlaylistResource($playlist);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_id' => ['required', 'integer', Rule::exists('organizations', 'id')],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:6144'],
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'work_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'season_number' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
            'release_year' => ['sometimes', 'nullable', 'integer', 'min:1900', 'max:2100'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,internal'],
        ]);

        $organization = Organization::query()->findOrFail((int) $validated['organization_id']);
        $slug = $this->resolveUniqueSlug($organization->id, $validated['slug'] ?? $validated['title']);

        $playlist = DB::transaction(function () use ($request, $validated, $organization, $slug): Playlist {
            $playlist = Playlist::query()->create([
                'organization_id' => $organization->id,
                'title' => $validated['title'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'work_title' => $validated['work_title'] ?? null,
                'season_number' => $validated['season_number'] ?? null,
                'release_year' => $validated['release_year'] ?? null,
                'visibility' => $validated['visibility'] ?? 'public',
            ]);

            if ($request->hasFile('cover')) {
                $path = $request->file('cover')?->store('playlist-covers', 'public');
                if ($path) {
                    $playlist->cover_path = $path;
                    $playlist->save();
                }
            }

            return $playlist;
        });

        $playlist->load('organization:id,name,slug')->loadCount(['posts', 'seasons']);

        $this->logAction('playlists.create', $playlist->title, 'Criou uma playlist', $playlist);

        return (new PlaylistResource($playlist))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $playlistId): PlaylistResource
    {
        $playlist = $this->findPlaylistById($playlistId, true);
        $before = $playlist->replicate();

        $validated = $request->validate([
            'organization_id' => ['sometimes', 'required', 'integer', Rule::exists('organizations', 'id')],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp', 'max:6144'],
            'remove_cover' => ['sometimes', 'boolean'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'work_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'season_number' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
            'release_year' => ['sometimes', 'nullable', 'integer', 'min:1900', 'max:2100'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,internal'],
        ]);

        DB::transaction(function () use ($request, $validated, $playlist): void {
            $organizationId = array_key_exists('organization_id', $validated)
                ? (int) $validated['organization_id']
                : (int) $playlist->organization_id;

            if (array_key_exists('slug', $validated)) {
                $base = (string) ($validated['slug'] ?: ($validated['title'] ?? $playlist->title));
                $playlist->slug = $this->resolveUniqueSlug($organizationId, $base, $playlist->id);
            }

            $playlist->fill([
                'organization_id' => $organizationId,
                'title' => $validated['title'] ?? $playlist->title,
                'description' => $validated['description'] ?? $playlist->description,
                'work_title' => $validated['work_title'] ?? $playlist->work_title,
                'season_number' => $validated['season_number'] ?? $playlist->season_number,
                'release_year' => $validated['release_year'] ?? $playlist->release_year,
                'visibility' => $validated['visibility'] ?? $playlist->visibility,
            ]);

            if ($request->boolean('remove_cover') && $playlist->cover_path) {
                Storage::disk('public')->delete($playlist->cover_path);
                $playlist->cover_path = null;
            }

            if ($request->hasFile('cover')) {
                if ($playlist->cover_path) {
                    Storage::disk('public')->delete($playlist->cover_path);
                }

                $path = $request->file('cover')?->store('playlist-covers', 'public');
                if ($path) {
                    $playlist->cover_path = $path;
                }
            }

            $playlist->save();
        });

        $playlist->refresh()->load('organization:id,name,slug')->loadCount(['posts', 'seasons']);

        if ($playlist->wasChanged()) {
            $this->logAction('playlists.edit', $playlist->title, 'Editou uma playlist', $playlist, $before);
        }

        return new PlaylistResource($playlist);
    }

    public function destroy(string $playlistId): JsonResponse
    {
        $playlist = $this->findPlaylistById($playlistId, false);
        $before = $playlist->replicate();

        $playlist->delete();

        $this->logAction('playlists.delete', $playlist->title, 'Excluiu (soft delete) uma playlist', $playlist, $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'with_deleted' => ['sometimes', 'boolean'],
        ]);

        $query = Playlist::query()->with('organization:id,name,slug');

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        $this->applySearch($query, $request->string('search')->toString(), ['id', 'title', 'slug']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'title', 'slug', 'visibility', 'created_at', 'updated_at',
        ], 'title', 'asc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return PlaylistResource::collection($query->limit(50)->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'visibility' => ['sometimes', 'nullable', 'in:public,private,internal'],
            'release_year' => ['sometimes', 'nullable', 'integer', 'min:1900', 'max:2100'],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'ID', 'value' => 'id'],
            ['name' => 'Comunidade', 'value' => static fn ($item) => $item->organization?->name],
            ['name' => 'Título', 'value' => 'title'],
            ['name' => 'Slug', 'value' => 'slug'],
            ['name' => 'Obra', 'value' => 'work_title'],
            ['name' => 'Ano', 'value' => 'release_year'],
            ['name' => 'Visibilidade', 'value' => 'visibility'],
            ['name' => 'Posts', 'value' => 'posts_count'],
            ['name' => 'Temporadas', 'value' => 'seasons_count'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
            ['name' => 'Deletada em', 'value' => 'deleted_at', 'format' => 'datetime'],
        ], $items, 'playlists', 'Exportou playlists');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = Playlist::query()
            ->with('organization:id,name,slug')
            ->withCount(['posts', 'seasons']);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        if ($request->filled('visibility')) {
            $query->where('visibility', $request->string('visibility')->toString());
        }

        if ($request->filled('release_year')) {
            $query->where('release_year', $request->integer('release_year'));
        }

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $range = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $range['start'], $range['end']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    private function findPlaylistById(string $playlistId, bool $withDeleted): Playlist
    {
        $query = Playlist::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where('id', (int) $playlistId)->firstOrFail();
    }

    private function resolveUniqueSlug(int $organizationId, string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base ?: 'playlist');
        if ($slug === '') {
            $slug = 'playlist';
        }

        $candidate = $slug;
        $suffix = 1;

        while (Playlist::query()
            ->withTrashed()
            ->when($ignoreId, fn (Builder $builder) => $builder->where('id', '!=', $ignoreId))
            ->where('organization_id', $organizationId)
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
