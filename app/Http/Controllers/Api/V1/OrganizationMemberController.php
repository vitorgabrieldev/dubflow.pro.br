<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\OrganizationOwnerTransfer;
use App\Models\User;
use App\Notifications\OrganizationOwnerTransferRequested;
use App\Notifications\OrganizationOwnerTransferResponded;
use App\Notifications\OrganizationMemberInvited;
use App\Notifications\OrganizationMemberInviteResponded;
use App\Notifications\OrganizationMemberJoined;
use App\Support\OrganizationAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrganizationMemberController extends Controller
{
    public function index(Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::isActiveMember($user, $organization)) {
            abort(403, 'Sem permissao para visualizar membros desta comunidade.');
        }

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
            'user_id' => ['required', 'integer', 'exists:users,id', Rule::notIn([$user->id])],
            'role' => ['required', Rule::in(['admin', 'editor', 'member'])],
        ]);

        $invitedUser = User::query()->findOrFail($validated['user_id']);
        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $validated['user_id'])
            ->first();

        if ($member?->status === 'active') {
            abort(422, 'Esse usuário já é membro ativo da comunidade.');
        }

        if ($member?->status === 'banned') {
            abort(422, 'Esse usuário está banido da comunidade.');
        }

        if ($member?->role === 'owner') {
            abort(422, 'Não é possível convidar o dono da comunidade.');
        }

        if ($member) {
            $member->role = $validated['role'];
            $member->status = 'pending';
            $member->source = 'invite';
            $member->invited_by_user_id = $user->id;
            $member->requested_by_user_id = null;
            $member->approved_by_user_id = null;
            $member->joined_at = null;
            $member->approved_at = null;
            $member->save();
        } else {
            $member = OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $validated['user_id'],
                'role' => $validated['role'],
                'status' => 'pending',
                'source' => 'invite',
                'invited_by_user_id' => $user->id,
            ]);
        }

        $invitedUser->notify(new OrganizationMemberInvited($organization, $user, $validated['role']));

        return response()->json([
            'message' => 'Convite enviado.',
            'member' => $member->load('user:id,name,username,avatar_path,email'),
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

        if (! $this->isPendingInviteMembership($member)) {
            abort(422, 'Solicitacoes de entrada devem ser aprovadas por owner/admin.');
        }

        $member->update([
            'status' => 'active',
            'source' => 'invite',
            'requested_by_user_id' => $member->requested_by_user_id ?: $user->id,
            'approved_by_user_id' => $member->invited_by_user_id,
            'joined_at' => now(),
            'approved_at' => now(),
        ]);

        $member->loadMissing([
            'organization:id,name,slug,avatar_path',
            'user:id,name,avatar_path',
            'inviter:id,name,avatar_path',
        ]);

        $this->notifyInviterAboutResponse($member, 'accepted');
        $this->notifyCommunityAboutNewMember($organization, $user, $member->role);

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

        if (! $this->isPendingInviteMembership($member)) {
            abort(422, 'Solicitacoes de entrada devem ser aprovadas por owner/admin.');
        }

        $member->update([
            'status' => 'rejected',
            'source' => 'invite',
            'approved_by_user_id' => null,
            'approved_at' => null,
        ]);

        $member->loadMissing([
            'organization:id,name,slug,avatar_path',
            'user:id,name,avatar_path',
            'inviter:id,name,avatar_path',
        ]);

        $this->notifyInviterAboutResponse($member, 'rejected');

        return response()->json([
            'message' => 'Convite recusado.',
            'member' => $member,
        ]);
    }

    public function approveJoinRequest(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para aprovar solicitacoes.');
        }

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->where('status', 'pending')
            ->where('source', 'join_request')
            ->first();

        if (! $member) {
            abort(422, 'Nao ha solicitacao pendente para este usuario.');
        }

        $member->update([
            'status' => 'active',
            'approved_by_user_id' => $user->id,
            'joined_at' => now(),
            'approved_at' => now(),
        ]);

        $member->loadMissing([
            'user:id,name,username,avatar_path,email',
        ]);

        $this->notifyCommunityAboutNewMember($organization, $memberUser, $member->role);

        return response()->json([
            'message' => 'Solicitacao aprovada.',
            'member' => $member,
        ]);
    }

    public function rejectJoinRequest(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para rejeitar solicitacoes.');
        }

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->where('status', 'pending')
            ->where('source', 'join_request')
            ->first();

        if (! $member) {
            abort(422, 'Nao ha solicitacao pendente para este usuario.');
        }

        $member->update([
            'status' => 'rejected',
            'approved_by_user_id' => $user->id,
            'approved_at' => now(),
        ]);

        $member->loadMissing([
            'user:id,name,username,avatar_path,email',
        ]);

        return response()->json([
            'message' => 'Solicitacao rejeitada.',
            'member' => $member,
        ]);
    }

    public function update(Request $request, Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::hasRole($user, $organization, ['owner'])) {
            abort(403, 'Apenas o dono pode alterar cargos.');
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'editor', 'member'])],
            'status' => ['nullable', Rule::in(['active', 'pending', 'rejected'])],
        ]);

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->firstOrFail();

        if ($member->role === 'owner') {
            abort(422, 'O dono da comunidade nao pode ter o cargo alterado.');
        }

        $member->role = $validated['role'];

        if (isset($validated['status'])) {
            $member->status = $validated['status'];
        }

        $member->save();

        return response()->json([
            'message' => 'Membro atualizado.',
            'member' => $member->load('user:id,name,username,avatar_path,email'),
        ]);
    }

    public function candidates(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para convidar membros.');
        }

        $term = trim($request->string('q')->toString());

        if (mb_strlen($term) < 1) {
            return response()->json([
                'users' => [],
            ]);
        }

        $users = User::query()
            ->where(function ($builder) use ($term) {
                $builder->where('name', 'like', '%'.$term.'%')
                    ->orWhere('email', 'like', '%'.$term.'%')
                    ->orWhere('username', 'like', '%'.$term.'%')
                    ->orWhere('stage_name', 'like', '%'.$term.'%');
            })
            ->whereDoesntHave('organizationMemberships', function ($builder) use ($organization) {
                $builder
                    ->where('organization_id', $organization->id)
                    ->whereIn('status', ['active', 'pending', 'banned']);
            })
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'name', 'email', 'username', 'avatar_path']);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function destroy(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para expulsar membros.');
        }

        if ($memberUser->id === $user->id) {
            abort(422, 'Você não pode expulsar a própria conta.');
        }

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->firstOrFail();

        if ($member->role === 'owner') {
            abort(422, 'Não é possível expulsar o dono da comunidade.');
        }

        if ($member->status === 'banned') {
            abort(422, 'Banimento permanente: não é possível remover este banimento.');
        }

        $requesterRole = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->value('role');

        if ($requesterRole === 'admin' && $member->role === 'admin') {
            abort(403, 'Colaborador não pode expulsar outro colaborador.');
        }

        $member->delete();

        return response()->json([
            'message' => 'Membro expulso com sucesso.',
        ]);
    }

    public function cancelInvite(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para anular convites.');
        }

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->where('status', 'pending')
            ->where('source', 'invite')
            ->where('role', '!=', 'owner')
            ->first();

        if (! $member) {
            abort(422, 'Não há convite pendente para este usuário.');
        }

        $member->delete();

        return response()->json([
            'message' => 'Convite anulado.',
        ]);
    }

    public function ban(Organization $organization, User $memberUser): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::canManageOrganization($user, $organization)) {
            abort(403, 'Sem permissao para banir membros.');
        }

        if ($memberUser->id === $user->id) {
            abort(422, 'Você não pode banir a própria conta.');
        }

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->firstOrFail();

        if ($member->role === 'owner') {
            abort(422, 'Não é possível banir o dono da comunidade.');
        }

        $requesterRole = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->value('role');

        if ($requesterRole === 'admin' && $member->role === 'admin') {
            abort(403, 'Colaborador não pode banir outro colaborador.');
        }

        $member->status = 'banned';
        $member->joined_at = null;
        $member->save();

        return response()->json([
            'message' => 'Membro banido com sucesso.',
            'member' => $member->load('user:id,name,username,avatar_path,email'),
        ]);
    }

    public function requestOwnerTransfer(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        if (! OrganizationAccess::hasRole($user, $organization, ['owner'])) {
            abort(403, 'Apenas o dono pode transferir a propriedade.');
        }

        $validated = $request->validate([
            'target_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $targetUser = User::query()->findOrFail($validated['target_user_id']);
        if ($targetUser->id === $user->id) {
            abort(422, 'Escolha outro membro para transferir a propriedade.');
        }

        $targetMember = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $targetUser->id)
            ->where('status', 'active')
            ->where('role', '!=', 'owner')
            ->first();

        if (! $targetMember) {
            abort(422, 'Esse usuário precisa ser membro ativo da comunidade para receber a propriedade.');
        }

        OrganizationOwnerTransfer::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'canceled',
                'responded_at' => now(),
            ]);

        $transfer = OrganizationOwnerTransfer::create([
            'organization_id' => $organization->id,
            'current_owner_user_id' => $user->id,
            'target_user_id' => $targetUser->id,
            'status' => 'pending',
        ]);

        $targetUser->notify(new OrganizationOwnerTransferRequested($organization, $user, $transfer));

        return response()->json([
            'message' => 'Pedido de transferência enviado. Aguardando aceite do membro.',
            'transfer' => $transfer,
        ]);
    }

    public function respondOwnerTransfer(Request $request, Organization $organization): JsonResponse
    {
        $user = auth('api')->user();

        $validated = $request->validate([
            'decision' => ['required', Rule::in(['accept', 'reject'])],
        ]);

        $transfer = OrganizationOwnerTransfer::query()
            ->where('organization_id', $organization->id)
            ->where('target_user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (! $transfer) {
            abort(422, 'Não existe transferência pendente para sua conta.');
        }

        if ($validated['decision'] === 'reject') {
            $transfer->update([
                'status' => 'rejected',
                'responded_at' => now(),
            ]);

            $transfer->currentOwner?->notify(
                new OrganizationOwnerTransferResponded($organization, $user, 'rejected')
            );

            return response()->json([
                'message' => 'Transferência recusada.',
                'transfer' => $transfer->fresh(),
            ]);
        }

        DB::transaction(function () use ($organization, $transfer): void {
            $lockedTransfer = OrganizationOwnerTransfer::query()
                ->where('id', $transfer->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->firstOrFail();

            $lockedOrganization = Organization::query()->where('id', $organization->id)->lockForUpdate()->firstOrFail();
            $oldOwnerId = (int) $lockedTransfer->current_owner_user_id;
            $newOwnerId = (int) $lockedTransfer->target_user_id;

            $lockedOrganization->owner_user_id = $newOwnerId;
            $lockedOrganization->save();

            OrganizationMember::query()
                ->where('organization_id', $lockedOrganization->id)
                ->where('role', 'owner')
                ->where('user_id', '!=', $newOwnerId)
                ->update([
                    'role' => 'admin',
                    'status' => 'active',
                ]);

            $newOwnerMembership = OrganizationMember::query()
                ->where('organization_id', $lockedOrganization->id)
                ->where('user_id', $newOwnerId)
                ->firstOrFail();

            $newOwnerMembership->role = 'owner';
            $newOwnerMembership->status = 'active';
            $newOwnerMembership->joined_at = $newOwnerMembership->joined_at ?: now();
            $newOwnerMembership->save();

            if ($oldOwnerId !== $newOwnerId) {
                $oldOwnerMembership = OrganizationMember::query()
                    ->where('organization_id', $lockedOrganization->id)
                    ->where('user_id', $oldOwnerId)
                    ->first();

                if ($oldOwnerMembership) {
                    $oldOwnerMembership->role = 'admin';
                    $oldOwnerMembership->status = 'active';
                    $oldOwnerMembership->joined_at = $oldOwnerMembership->joined_at ?: now();
                    $oldOwnerMembership->save();
                }
            }

            $lockedTransfer->status = 'accepted';
            $lockedTransfer->responded_at = now();
            $lockedTransfer->save();

            OrganizationOwnerTransfer::query()
                ->where('organization_id', $lockedOrganization->id)
                ->where('status', 'pending')
                ->where('id', '!=', $lockedTransfer->id)
                ->update([
                    'status' => 'canceled',
                    'responded_at' => now(),
                ]);
        });

        $transfer->refresh();
        $transfer->currentOwner?->notify(
            new OrganizationOwnerTransferResponded($organization, $user, 'accepted')
        );

        return response()->json([
            'message' => 'Transferência aceita. Você agora é o dono da comunidade.',
            'transfer' => $transfer,
        ]);
    }

    private function isPendingInviteMembership(OrganizationMember $member): bool
    {
        if ($member->status !== 'pending') {
            return false;
        }

        if ($member->source === 'invite') {
            return true;
        }

        return $member->source === null && $member->invited_by_user_id !== null;
    }

    private function notifyInviterAboutResponse(OrganizationMember $member, string $status): void
    {
        if (! in_array($status, ['accepted', 'rejected'], true)) {
            return;
        }

        $inviter = $member->inviter;
        $acceptedUser = $member->user;
        $organization = $member->organization;

        if (! $inviter || ! $acceptedUser || ! $organization) {
            return;
        }

        if ($inviter->id === $acceptedUser->id) {
            return;
        }

        $inviter->notify(new OrganizationMemberInviteResponded($organization, $acceptedUser, $status));
    }

    private function notifyCommunityAboutNewMember(Organization $organization, User $newMember, string $role): void
    {
        $recipients = $organization->users()
            ->wherePivot('status', 'active')
            ->where('users.id', '!=', $newMember->id)
            ->distinct('users.id')
            ->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new OrganizationMemberJoined($organization, $newMember, $role));
        }
    }
}
