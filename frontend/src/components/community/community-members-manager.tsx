"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  CheckCircle2,
  Crown,
  Eye,
  Handshake,
  Loader2,
  MailPlus,
  Mic2,
  XCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/api";

type MemberRole = "owner" | "admin" | "editor" | "member";
type MemberStatus = "active" | "pending" | "rejected" | "banned";

type OrganizationMember = {
  id: number;
  role: MemberRole;
  status: MemberStatus;
  user?: {
    id: number;
    name: string;
    username: string | null;
    avatar_path: string | null;
    email?: string | null;
  };
};

type CandidateUser = {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  avatar_path: string | null;
};

export function CommunityMembersManager({
  locale,
  organizationSlug,
  viewerRole,
  currentUserId,
  initialMembers,
}: {
  locale: string;
  organizationSlug: string;
  viewerRole: MemberRole | null;
  currentUserId: number | null;
  initialMembers: OrganizationMember[];
}) {
  const [members, setMembers] = useState<OrganizationMember[]>(initialMembers);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [cancelingUserId, setCancelingUserId] = useState<number | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [resendingUserId, setResendingUserId] = useState<number | null>(null);
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [transferringOwnerUserId, setTransferringOwnerUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [candidateResults, setCandidateResults] = useState<CandidateUser[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);
  const [inviteRole, setInviteRole] = useState<Exclude<MemberRole, "owner">>("admin");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canInvite = viewerRole === "owner" || viewerRole === "admin";
  const canManageRoles = viewerRole === "owner";
  const canBanMembers = viewerRole === "owner" || viewerRole === "admin";
  const canExpelMembers = viewerRole === "owner" || viewerRole === "admin";

  useEffect(() => {
    if (!canInvite) {
      return;
    }

    const term = searchTerm.trim();
    if (term.length < 2 || selectedCandidate) {
      setCandidateResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setCandidateLoading(true);

      try {
        const response = await fetch(
          `/api/organizations/${organizationSlug}/members/candidates?q=${encodeURIComponent(term)}`,
          {
            cache: "no-store",
          }
        );

        const payload = (await response.json().catch(() => ({}))) as { users?: CandidateUser[] };
        setCandidateResults(response.ok ? payload.users ?? [] : []);
      } catch {
        setCandidateResults([]);
      } finally {
        setCandidateLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canInvite, organizationSlug, searchTerm, selectedCandidate]);

  useEffect(() => {
    if (!feedback && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setError(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error, feedback]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const leftRank = roleRank(a.role);
      const rightRank = roleRank(b.role);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return (a.user?.name ?? "").localeCompare(b.user?.name ?? "", "pt-BR");
    });
  }, [members]);

  async function handleRoleChange(member: OrganizationMember, nextRole: Exclude<MemberRole, "owner">) {
    const memberUserId = member.user?.id;
    if (!memberUserId || !canManageRoles) {
      return;
    }

    setSavingUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/${memberUserId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nextRole,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; member?: OrganizationMember };

      if (!response.ok) {
        setError(payload.message ?? "Não foi possível alterar o cargo.");
        return;
      }

      setMembers((prev) =>
        prev.map((item) => {
          if (item.user?.id !== memberUserId) {
            return item;
          }

          return payload.member
            ? {
                ...item,
                ...payload.member,
                user: payload.member.user ?? item.user,
              }
            : { ...item, role: nextRole };
        })
      );

      setFeedback("Cargo atualizado.");
    } catch {
      setError("Não foi possível alterar o cargo.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleInvite() {
    if (!selectedCandidate) {
      setError("Selecione uma pessoa para convidar.");
      return;
    }

    setInviting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedCandidate.id,
          role: inviteRole,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; member?: OrganizationMember };

      if (!response.ok) {
        setError(payload.message ?? "Não foi possível enviar o convite.");
        return;
      }

      if (payload.member) {
        const memberPayload = payload.member;
        setMembers((prev) => {
          const existingIndex = prev.findIndex((item) => item.user?.id === memberPayload.user?.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              ...memberPayload,
              user: memberPayload.user ?? next[existingIndex].user,
            };
            return next;
          }

          return [memberPayload, ...prev];
        });
      }

      setFeedback(payload.message ?? "Convite enviado.");
      setSelectedCandidate(null);
      setSearchTerm("");
      setCandidateResults([]);
    } catch {
      setError("Não foi possível enviar o convite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(member: OrganizationMember) {
    const memberUserId = member.user?.id;
    if (!memberUserId || !canInvite || member.status !== "pending") {
      return;
    }

    setCancelingUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/${memberUserId}/invite`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível anular o convite.");
        return;
      }

      setMembers((prev) => prev.filter((item) => item.user?.id !== memberUserId));
      setFeedback(payload.message ?? "Convite anulado.");
    } catch {
      setError("Não foi possível anular o convite.");
    } finally {
      setCancelingUserId(null);
    }
  }

  async function handleRemoveMember(member: OrganizationMember) {
    const memberUserId = member.user?.id;
    if (!memberUserId || !canExpelMembers || member.role === "owner") {
      return;
    }

    const isActiveMember = member.status === "active";

    setRemovingUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/${memberUserId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? (isActiveMember ? "Não foi possível expulsar o membro." : "Não foi possível remover o membro."));
        return;
      }

      setMembers((prev) => prev.filter((item) => item.user?.id !== memberUserId));
      setFeedback(payload.message ?? (isActiveMember ? "Membro expulso." : "Membro removido."));
    } catch {
      setError(isActiveMember ? "Não foi possível expulsar o membro." : "Não foi possível remover o membro.");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleResendInvite(member: OrganizationMember) {
    const memberUserId = member.user?.id;
    if (!memberUserId || !canInvite || member.status !== "rejected") {
      return;
    }

    const roleToSend: Exclude<MemberRole, "owner"> = member.role === "owner" ? "member" : member.role;

    setResendingUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: memberUserId,
          role: roleToSend,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; member?: OrganizationMember };
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível reenviar o convite.");
        return;
      }

      setMembers((prev) =>
        prev.map((item) => {
          if (item.user?.id !== memberUserId) {
            return item;
          }

          return payload.member
            ? {
                ...item,
                ...payload.member,
                user: payload.member.user ?? item.user,
              }
            : { ...item, status: "pending", role: roleToSend };
        })
      );

      setFeedback(payload.message ?? "Convite reenviado.");
    } catch {
      setError("Não foi possível reenviar o convite.");
    } finally {
      setResendingUserId(null);
    }
  }

  async function handleBanMember(member: OrganizationMember) {
    const memberUserId = member.user?.id;
    if (!memberUserId || !canBanMembers || member.role === "owner" || member.status === "banned") {
      return;
    }

    setBanningUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/members/${memberUserId}/ban`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; member?: OrganizationMember };
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível banir o membro.");
        return;
      }

      setMembers((prev) =>
        prev.map((item) => {
          if (item.user?.id !== memberUserId) {
            return item;
          }

          return payload.member
            ? {
                ...item,
                ...payload.member,
                user: payload.member.user ?? item.user,
              }
            : { ...item, status: "banned" };
        })
      );

      setFeedback(payload.message ?? "Membro banido.");
    } catch {
      setError("Não foi possível banir o membro.");
    } finally {
      setBanningUserId(null);
    }
  }

  async function handleRequestOwnerTransfer(member: OrganizationMember) {
    const memberUserId = member.user?.id;
    if (!memberUserId || viewerRole !== "owner" || member.status !== "active" || member.role === "owner") {
      return;
    }

    setTransferringOwnerUserId(memberUserId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/owner-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_user_id: memberUserId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível solicitar a transferência de propriedade.");
        return;
      }

      setFeedback(payload.message ?? "Pedido de transferência enviado.");
    } catch {
      setError("Não foi possível solicitar a transferência de propriedade.");
    } finally {
      setTransferringOwnerUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Users size={14} />
          Gestão de membros
        </p>
        <Link
          href={`/${locale}/organizations/${organizationSlug}`}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-black/15 px-3 text-sm font-semibold text-[var(--color-ink)]"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {feedback ? (
        <p className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} />
          {feedback}
        </p>
      ) : null}

      {error ? <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-[10px] border border-black/10 bg-white p-3 sm:p-4">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <MailPlus size={14} />
          Convidar por e-mail
        </p>

        {canInvite ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSelectedCandidate(null);
                    setError(null);
                  }}
                  placeholder="Digite nome ou e-mail"
                  className="h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none ring-[var(--color-primary)]/40 transition focus:ring-2"
                />

                {candidateLoading ? (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/45">Buscando...</span>
                ) : null}

                {candidateResults.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[8px] border border-black/10 bg-white p-1 shadow-lg">
                    {candidateResults.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setSearchTerm(formatCandidate(candidate));
                          setCandidateResults([]);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-left hover:bg-black/5"
                      >
                        <Avatar
                          src={resolveMediaUrl(candidate.avatar_path)}
                          name={candidate.name}
                          size="sm"
                          className="rounded-full"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{candidate.name}</span>
                          <span className="block truncate text-xs text-black/55">{candidate.email ?? "-"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <RoleDropdown
                value={inviteRole}
                onChange={(nextRole) => setInviteRole(nextRole)}
                options={[
                  { value: "admin", label: "Colaborador" },
                  { value: "editor", label: "Dublador" },
                  { value: "member", label: "Usuário" },
                ]}
                className="h-11"
              />

              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={!selectedCandidate || inviting}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : null}
                Convidar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-black/60">Apenas dono e colaborador podem convidar.</p>
        )}
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-3 sm:p-4">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <ShieldCheck size={14} />
          Membros e cargos
        </p>

        <div className="space-y-2">
          {sortedMembers.map((member) => {
            const memberUserId = member.user?.id ?? null;
            const isSelf = memberUserId !== null && currentUserId === memberUserId;
            const disableRoleEdit = !canManageRoles || member.role === "owner" || member.status === "banned" || isSelf || memberUserId === null;
            const isSavingThisRow = memberUserId !== null && savingUserId === memberUserId;
            const canBanThisMember =
              member.status === "active" &&
              canBanMembers &&
              !isSelf &&
              member.role !== "owner" &&
              !(viewerRole === "admin" && member.role === "admin") &&
              memberUserId !== null;
            const canExpelThisMember =
              member.status === "active" &&
              canExpelMembers &&
              !isSelf &&
              member.role !== "owner" &&
              !(viewerRole === "admin" && member.role === "admin") &&
              memberUserId !== null;
            const canTransferOwnership =
              viewerRole === "owner" &&
              member.status === "active" &&
              !isSelf &&
              member.role !== "owner" &&
              memberUserId !== null;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    src={resolveMediaUrl(member.user?.avatar_path)}
                    name={member.user?.name ?? "Membro"}
                    size="sm"
                    className="rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{member.user?.name ?? "Membro"}</p>
                    <p className="line-clamp-1 text-xs text-black/55">{member.user?.email ?? `@${member.user?.username ?? "sem-usuario"}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-[6px] bg-black/5 px-2 py-1 text-xs text-black/70">{statusLabel(member.status)}</span>
                  {disableRoleEdit ? (
                    <span className="inline-flex h-9 min-w-[140px] items-center justify-center rounded-[8px] border border-[var(--color-border-soft)] bg-white px-2 text-xs font-semibold text-[var(--color-ink)]">
                      {roleLabel(member.role)}
                    </span>
                  ) : (
                    <RoleDropdown
                      value={member.role as Exclude<MemberRole, "owner">}
                      onChange={(nextRole) => {
                        void handleRoleChange(member, nextRole);
                      }}
                      options={[
                        { value: "admin", label: "Colaborador" },
                        { value: "editor", label: "Dublador" },
                        { value: "member", label: "Usuário" },
                      ]}
                      disabled={isSavingThisRow}
                      className="h-9 min-w-[140px]"
                    />
                  )}
                  {member.status === "pending" && canInvite && memberUserId !== null ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelInvite(member)}
                      disabled={cancelingUserId === memberUserId}
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Anular
                    </button>
                  ) : null}
                  {member.status === "rejected" && canInvite && memberUserId !== null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(member)}
                        disabled={removingUserId === memberUserId}
                        className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-black/15 bg-white px-2 text-xs font-semibold text-black/75 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                        Remover
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResendInvite(member)}
                        disabled={resendingUserId === memberUserId}
                        className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 text-xs font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resendingUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <MailPlus size={12} />}
                        Reenviar convite
                      </button>
                    </>
                  ) : null}
                  {canBanThisMember ? (
                    <button
                      type="button"
                      onClick={() => void handleBanMember(member)}
                      disabled={banningUserId === memberUserId}
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {banningUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                      Banir
                    </button>
                  ) : null}
                  {canExpelThisMember ? (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member)}
                      disabled={removingUserId === memberUserId}
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-black/15 bg-white px-2 text-xs font-semibold text-black/75 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Expulsar
                    </button>
                  ) : null}
                  {canTransferOwnership ? (
                    <button
                      type="button"
                      onClick={() => void handleRequestOwnerTransfer(member)}
                      disabled={transferringOwnerUserId === memberUserId}
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-[8px] border border-amber-200 bg-amber-50 px-2 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {transferringOwnerUserId === memberUserId ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                      Transferir dono
                    </button>
                  ) : null}
                  {isSavingThisRow ? <Loader2 size={14} className="animate-spin text-black/60" /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--color-primary)]/25 bg-[linear-gradient(140deg,rgba(139,92,246,0.16),rgba(255,255,255,0.92))] p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)]/18 text-[var(--color-primary-strong)]">
            <ShieldCheck size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Regras de cargo</p>
            <p className="text-xs text-black/60">Defina permissões com clareza para evitar conflitos.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[8px] border border-black/10 bg-white/80 p-2.5">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
              <Crown size={13} className="text-amber-500" />
              Dono
            </p>
            <p className="mt-1 text-xs text-black/65">Único na comunidade.</p>
          </div>

          <div className="rounded-[8px] border border-black/10 bg-white/80 p-2.5">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
              <Handshake size={13} className="text-sky-600" />
              Colaborador
            </p>
            <p className="mt-1 text-xs text-black/65">Pode convidar membros.</p>
          </div>

          <div className="rounded-[8px] border border-black/10 bg-white/80 p-2.5">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
              <Mic2 size={13} className="text-[var(--color-primary-strong)]" />
              Dublador
            </p>
            <p className="mt-1 text-xs text-black/65">Pode visualizar e publicar episódios.</p>
          </div>

          <div className="rounded-[8px] border border-black/10 bg-white/80 p-2.5">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
              <Eye size={13} className="text-black/70" />
              Usuário
            </p>
            <p className="mt-1 text-xs text-black/65">Pode somente visualizar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function roleRank(role: MemberRole) {
  if (role === "owner") {
    return 0;
  }
  if (role === "admin") {
    return 1;
  }
  if (role === "editor") {
    return 2;
  }
  return 3;
}

function formatCandidate(candidate: CandidateUser) {
  return `${candidate.name} (${candidate.email ?? "sem-email"})`;
}

function statusLabel(status: MemberStatus) {
  if (status === "active") {
    return "Ativo";
  }
  if (status === "pending") {
    return "Pendente";
  }
  if (status === "banned") {
    return "Banido";
  }
  return "Recusado";
}

function roleLabel(role: MemberRole | Exclude<MemberRole, "owner">) {
  if (role === "owner") {
    return "Dono";
  }
  if (role === "admin") {
    return "Colaborador";
  }
  if (role === "editor") {
    return "Dublador";
  }
  return "Usuário";
}

function RoleDropdown({
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: {
  value: Exclude<MemberRole, "owner">;
  options: Array<{ value: Exclude<MemberRole, "owner">; label: string }>;
  onChange: (nextRole: Exclude<MemberRole, "owner">) => void;
  disabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className={`inline-flex h-full w-full cursor-pointer items-center justify-between rounded-[8px] border border-[var(--color-border-soft)] bg-white px-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-65`}
      >
        <span>{roleLabel(value)}</span>
        <ChevronDown size={13} className={`text-black/55 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 min-w-full rounded-[8px] border border-black/10 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setOpen(false);
                if (option.value !== value) {
                  onChange(option.value);
                }
              }}
              className={`flex w-full cursor-pointer items-center rounded-[6px] px-2 py-2 text-left text-xs font-semibold ${
                option.value === value
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                  : "text-black/75 hover:bg-black/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
