<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMember;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationInviteController extends Controller
{
    public function index(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para visualizar convites.');
        }

        $invites = OrganizationInvite::query()
            ->where('organization_id', $organization->id)
            ->with('creator:id,name,username,avatar_path')
            ->orderByDesc('created_at')
            ->paginate(40);

        return response()->json($invites);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para criar convites.');
        }

        $validated = $request->validate([
            'role' => ['nullable', Rule::in(['admin', 'editor', 'member'])],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'expires_in_hours' => ['nullable', 'integer', 'min:1', 'max:2160'],
        ]);

        $invite = OrganizationInvite::create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $user->id,
            'token' => Str::random(64),
            'role' => $validated['role'] ?? 'member',
            'max_uses' => $validated['max_uses'] ?? 1,
            'expires_at' => isset($validated['expires_in_hours'])
                ? now()->addHours((int) $validated['expires_in_hours'])
                : now()->addHours(72),
        ]);

        Log::channel('audit')->info('organization_invite_created', [
            'organization_id' => $organization->id,
            'invite_id' => $invite->id,
            'created_by_user_id' => $user->id,
            'role' => $invite->role,
            'max_uses' => $invite->max_uses,
            'expires_at' => optional($invite->expires_at)->toIso8601String(),
        ]);

        return response()->json([
            'message' => 'Link de convite criado com sucesso.',
            'invite' => $invite,
            'accept_url' => sprintf('/api/v1/organizations/invites/%s/accept', $invite->token),
        ], 201);
    }

    public function revoke(Organization $organization, OrganizationInvite $invite): JsonResponse
    {
        $user = auth('api')->user();

        if ($invite->organization_id !== $organization->id) {
            abort(404);
        }

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para revogar convites.');
        }

        $invite->revoked_at = now();
        $invite->save();

        Log::channel('audit')->info('organization_invite_revoked', [
            'organization_id' => $organization->id,
            'invite_id' => $invite->id,
            'revoked_by_user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Convite revogado.',
            'invite' => $invite,
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $user = auth('api')->user();

        return DB::transaction(function () use ($token, $user): JsonResponse {
            $invite = OrganizationInvite::query()
                ->where('token', $token)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $invite->isActive()) {
                abort(422, 'Convite expirado, revogado ou sem vagas.');
            }

            $membership = OrganizationMember::query()
                ->where('organization_id', $invite->organization_id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($membership?->status === 'active') {
                return response()->json([
                    'message' => 'Você já é membro da Comunidade.',
                ]);
            }

            if (! $membership) {
                $membership = new OrganizationMember([
                    'organization_id' => $invite->organization_id,
                    'user_id' => $user->id,
                ]);
            }

            $membership->role = $membership->role === 'owner' ? 'owner' : $invite->role;
            $membership->status = 'active';
            $membership->source = 'invite';
            $membership->invited_by_user_id = $invite->created_by_user_id;
            $membership->requested_by_user_id = $user->id;
            $membership->approved_by_user_id = $invite->created_by_user_id;
            $membership->joined_at = now();
            $membership->approved_at = now();
            $membership->save();

            $invite->uses_count += 1;
            if ($invite->uses_count >= $invite->max_uses) {
                $invite->revoked_at = now();
            }
            $invite->save();

            Log::channel('audit')->info('organization_invite_accepted', [
                'organization_id' => $invite->organization_id,
                'invite_id' => $invite->id,
                'accepted_by_user_id' => $user->id,
                'role' => $membership->role,
            ]);

            return response()->json([
                'message' => 'Convite aceito com sucesso.',
                'organization_id' => $invite->organization_id,
                'membership' => $membership,
            ]);
        });
    }
}
