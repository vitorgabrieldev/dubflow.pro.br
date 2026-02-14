<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganizationMemberController extends Controller
{
    public function index(Organization $organization): JsonResponse
    {
        $members = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->with('user:id,name,username,avatar_path,email')
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json($members);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para gerenciar membros.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', Rule::in(['admin', 'editor', 'member'])],
        ]);

        $member = OrganizationMember::query()->updateOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $validated['user_id'],
            ],
            [
                'role' => $validated['role'],
                'status' => 'pending',
                'invited_by_user_id' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Convite enviado.',
            'member' => $member,
        ], 201);
    }

    public function accept(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $member->update([
            'status' => 'active',
            'joined_at' => now(),
        ]);

        return response()->json([
            'message' => 'Convite aceito.',
            'member' => $member,
        ]);
    }

    public function reject(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $member->update([
            'status' => 'rejected',
        ]);

        return response()->json([
            'message' => 'Convite recusado.',
            'member' => $member,
        ]);
    }

    public function update(Request $request, Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para gerenciar membros.');
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'editor', 'member'])],
            'status' => ['nullable', Rule::in(['active', 'pending', 'rejected'])],
        ]);

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->firstOrFail();

        $member->role = $validated['role'];

        if (isset($validated['status'])) {
            $member->status = $validated['status'];
        }

        $member->save();

        return response()->json([
            'message' => 'Membro atualizado.',
            'member' => $member,
        ]);
    }

    public function destroy(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para gerenciar membros.');
        }

        OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->where('role', '!=', 'owner')
            ->delete();

        return response()->json([
            'message' => 'Membro removido.',
        ]);
    }
}
