<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Resources\Admin\OpportunityResource;
use App\Models\DubbingTest;
use App\Models\DubbingTestCharacter;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OpportunitiesController extends Controller
{
    /**
     * @var array<int, string>
     */
    private array $sortable = [
        'id',
        'organization_id',
        'created_by_user_id',
        'title',
        'visibility',
        'status',
        'starts_at',
        'ends_at',
        'results_release_at',
        'created_at',
        'updated_at',
    ];

    /**
     * @var array<int, string>
     */
    private array $searchable = [
        'id',
        'title',
        'description',
        'visibility',
        'status',
    ];

    /**
     * @var array<int, string>
     */
    private array $allowedStatus = [
        'draft',
        'published',
        'closed',
        'results_released',
        'archived',
    ];

    public function index(Request $request)
    {
        $request->validate([
            'limit' => ['sometimes', 'nullable', 'integer'],
            'page' => ['sometimes', 'nullable', 'integer'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'created_by_user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'visibility' => ['sometimes', 'nullable', 'in:internal,external'],
            'status' => ['sometimes', 'nullable', Rule::in($this->allowedStatus)],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
            'starts_at' => ['sometimes', 'array'],
            'starts_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $query = $this->buildIndexQuery($request);
        $limit = $this->resolveLimit($request->integer('limit'));

        $items = $query->paginate($limit)->appends($request->except('page'));

        return OpportunityResource::collection($items);
    }

    public function show(string $opportunityId): OpportunityResource
    {
        $opportunity = $this->findOpportunityById($opportunityId, true);
        $opportunity->load(['organization:id,name,slug', 'creator:id,uuid,name,email', 'characters', 'media'])
            ->loadCount(['characters', 'submissions']);

        return new OpportunityResource($opportunity);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_id' => ['required', 'integer', Rule::exists('organizations', 'id')],
            'created_by_user_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'uuid')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'visibility' => ['required', 'in:internal,external'],
            'status' => ['required', Rule::in($this->allowedStatus)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'results_release_at' => ['required', 'date', 'after_or_equal:ends_at'],
            'characters' => ['sometimes', 'array'],
            'characters.*.name' => ['required_with:characters', 'string', 'max:255'],
            'characters.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'characters.*.expectations' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'characters.*.appearance_estimate' => ['required_with:characters', 'in:protagonista,coadjuvante,pontas,figurante,voz_adicional'],
        ]);

        $organization = Organization::query()->findOrFail((int) $validated['organization_id']);
        $creator = $this->resolveCreator($validated['created_by_user_uuid'] ?? null);

        $opportunity = DB::transaction(function () use ($validated, $organization, $creator): DubbingTest {
            $opportunity = DubbingTest::query()->create([
                'organization_id' => $organization->id,
                'created_by_user_id' => $creator->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'visibility' => $validated['visibility'],
                'status' => $validated['status'],
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'],
                'results_release_at' => $validated['results_release_at'],
            ]);

            foreach ($validated['characters'] ?? [] as $index => $character) {
                DubbingTestCharacter::query()->create([
                    'dubbing_test_id' => $opportunity->id,
                    'name' => $character['name'],
                    'description' => $character['description'] ?? null,
                    'expectations' => $character['expectations'] ?? null,
                    'appearance_estimate' => $character['appearance_estimate'],
                    'position' => $index,
                ]);
            }

            return $opportunity;
        });

        $opportunity->load(['organization:id,name,slug', 'creator:id,uuid,name,email', 'characters'])
            ->loadCount(['characters', 'submissions']);

        $this->logAction('opportunities.create', $opportunity->title, 'Criou uma oportunidade', $opportunity);

        return (new OpportunityResource($opportunity))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $opportunityId): OpportunityResource
    {
        $opportunity = $this->findOpportunityById($opportunityId, true);
        $before = $opportunity->replicate();

        $validated = $request->validate([
            'organization_id' => ['sometimes', 'required', 'integer', Rule::exists('organizations', 'id')],
            'created_by_user_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'uuid')],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'visibility' => ['sometimes', 'required', 'in:internal,external'],
            'status' => ['sometimes', 'required', Rule::in($this->allowedStatus)],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['sometimes', 'required', 'date'],
            'results_release_at' => ['sometimes', 'required', 'date'],
            'characters' => ['sometimes', 'array'],
            'characters.*.name' => ['required_with:characters', 'string', 'max:255'],
            'characters.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'characters.*.expectations' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'characters.*.appearance_estimate' => ['required_with:characters', 'in:protagonista,coadjuvante,pontas,figurante,voz_adicional'],
        ]);

        $startsAt = array_key_exists('starts_at', $validated)
            ? Carbon::parse((string) $validated['starts_at'])
            : $opportunity->starts_at;
        $endsAt = array_key_exists('ends_at', $validated)
            ? Carbon::parse((string) $validated['ends_at'])
            : $opportunity->ends_at;
        $resultsReleaseAt = array_key_exists('results_release_at', $validated)
            ? Carbon::parse((string) $validated['results_release_at'])
            : $opportunity->results_release_at;

        if ($endsAt->lessThanOrEqualTo($startsAt)) {
            abort(422, 'A data final deve ser maior que a data inicial.');
        }

        if ($resultsReleaseAt->lessThan($endsAt)) {
            abort(422, 'A data de resultado deve ser igual ou posterior ao encerramento.');
        }

        DB::transaction(function () use ($validated, $opportunity): void {
            if (array_key_exists('created_by_user_uuid', $validated) && ! empty($validated['created_by_user_uuid'])) {
                $creator = User::query()->where('uuid', $validated['created_by_user_uuid'])->firstOrFail();
                $opportunity->created_by_user_id = $creator->id;
            }

            $opportunity->fill([
                'organization_id' => array_key_exists('organization_id', $validated)
                    ? (int) $validated['organization_id']
                    : $opportunity->organization_id,
                'title' => $validated['title'] ?? $opportunity->title,
                'description' => $validated['description'] ?? $opportunity->description,
                'visibility' => $validated['visibility'] ?? $opportunity->visibility,
                'status' => $validated['status'] ?? $opportunity->status,
                'starts_at' => $validated['starts_at'] ?? $opportunity->starts_at,
                'ends_at' => $validated['ends_at'] ?? $opportunity->ends_at,
                'results_release_at' => $validated['results_release_at'] ?? $opportunity->results_release_at,
            ]);
            $opportunity->save();

            if (array_key_exists('characters', $validated)) {
                $opportunity->characters()->delete();

                foreach ($validated['characters'] as $index => $character) {
                    DubbingTestCharacter::query()->create([
                        'dubbing_test_id' => $opportunity->id,
                        'name' => $character['name'],
                        'description' => $character['description'] ?? null,
                        'expectations' => $character['expectations'] ?? null,
                        'appearance_estimate' => $character['appearance_estimate'],
                        'position' => $index,
                    ]);
                }
            }
        });

        $opportunity->refresh()->load(['organization:id,name,slug', 'creator:id,uuid,name,email', 'characters'])
            ->loadCount(['characters', 'submissions']);

        if ($opportunity->wasChanged()) {
            $this->logAction('opportunities.edit', $opportunity->title, 'Editou uma oportunidade', $opportunity, $before);
        }

        return new OpportunityResource($opportunity);
    }

    public function destroy(string $opportunityId): JsonResponse
    {
        $opportunity = $this->findOpportunityById($opportunityId, false);
        $before = $opportunity->replicate();

        $opportunity->delete();

        $this->logAction('opportunities.delete', $opportunity->title, 'Excluiu (soft delete) uma oportunidade', $opportunity, $before);

        return response()->json([], 204);
    }

    public function autocomplete(Request $request)
    {
        $request->validate([
            'search' => ['sometimes', 'nullable', 'string'],
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'status' => ['sometimes', 'nullable', Rule::in($this->allowedStatus)],
            'with_deleted' => ['sometimes', 'boolean'],
        ]);

        $query = DubbingTest::query()->with(['organization:id,name,slug', 'creator:id,uuid,name,email']);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $this->applySearch($query, $request->string('search')->toString(), ['id', 'title', 'status']);

        $orderBy = $this->parseOrderBy($request->input('orderBy'), [
            'id', 'title', 'status', 'starts_at', 'created_at', 'updated_at',
        ], 'id', 'desc');

        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return OpportunityResource::collection($query->limit(50)->get());
    }

    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'orderBy' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'organization_id' => ['sometimes', 'nullable', 'integer'],
            'created_by_user_uuid' => ['sometimes', 'nullable', 'uuid'],
            'visibility' => ['sometimes', 'nullable', 'in:internal,external'],
            'status' => ['sometimes', 'nullable', Rule::in($this->allowedStatus)],
            'with_deleted' => ['sometimes', 'boolean'],
            'created_at' => ['sometimes', 'array'],
            'created_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
            'starts_at' => ['sometimes', 'array'],
            'starts_at.*' => ['sometimes', 'date_format:Y-m-d\TH:i:sP'],
        ]);

        $items = $this->buildIndexQuery($request)->get();

        return $this->exportAsCsv([
            ['name' => 'ID', 'value' => 'id'],
            ['name' => 'Comunidade', 'value' => static fn ($item) => $item->organization?->name],
            ['name' => 'Responsável', 'value' => static fn ($item) => $item->creator?->name],
            ['name' => 'Título', 'value' => 'title'],
            ['name' => 'Status', 'value' => 'status'],
            ['name' => 'Visibilidade', 'value' => 'visibility'],
            ['name' => 'Início', 'value' => 'starts_at', 'format' => 'datetime'],
            ['name' => 'Fim', 'value' => 'ends_at', 'format' => 'datetime'],
            ['name' => 'Resultado', 'value' => 'results_release_at', 'format' => 'datetime'],
            ['name' => 'Personagens', 'value' => 'characters_count'],
            ['name' => 'Inscrições', 'value' => 'submissions_count'],
            ['name' => 'Criação', 'value' => 'created_at', 'format' => 'datetime'],
            ['name' => 'Atualização', 'value' => 'updated_at', 'format' => 'datetime'],
            ['name' => 'Deletada em', 'value' => 'deleted_at', 'format' => 'datetime'],
        ], $items, 'opportunities', 'Exportou oportunidades');
    }

    private function buildIndexQuery(Request $request): Builder
    {
        $query = DubbingTest::query()
            ->with(['organization:id,name,slug', 'creator:id,uuid,name,email'])
            ->withCount(['characters', 'submissions']);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->integer('organization_id'));
        }

        if ($request->filled('created_by_user_uuid')) {
            $creatorId = User::query()->where('uuid', $request->string('created_by_user_uuid')->toString())->value('id');
            if ($creatorId) {
                $query->where('created_by_user_id', $creatorId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('visibility')) {
            $query->where('visibility', $request->string('visibility')->toString());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $this->applySearch($query, $request->string('search')->toString(), $this->searchable);

        $createdRange = $this->parseDateRange($request, 'created_at');
        $this->applyDateRange($query, $createdRange['start'], $createdRange['end']);

        $startsRange = $this->parseDateRange($request, 'starts_at');
        $this->applyDateRange($query, $startsRange['start'], $startsRange['end'], 'starts_at');

        $orderBy = $this->parseOrderBy($request->input('orderBy'), $this->sortable, 'id', 'desc');
        foreach ($orderBy as $item) {
            $query->orderBy($item['name'], $item['sort']);
        }

        return $query;
    }

    private function findOpportunityById(string $opportunityId, bool $withDeleted): DubbingTest
    {
        $query = DubbingTest::query();

        if ($withDeleted) {
            $query->withTrashed();
        }

        return $query->where('id', (int) $opportunityId)->firstOrFail();
    }

    private function resolveCreator(?string $creatorUuid): User
    {
        if ($creatorUuid) {
            return User::query()->where('uuid', $creatorUuid)->firstOrFail();
        }

        $current = $this->currentUser();

        if ($current instanceof User) {
            return $current;
        }

        return User::query()->orderBy('id')->firstOrFail();
    }
}
