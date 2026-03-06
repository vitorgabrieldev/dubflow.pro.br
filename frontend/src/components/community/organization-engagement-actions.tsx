"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, Users } from "lucide-react";

import { FollowOrganizationButton } from "@/components/community/follow-organization-button";
import { Button } from "@/components/ui/button";

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type OrganizationEngagementActionsProps = {
  locale: string;
  slug: string;
  isAuthenticated: boolean;
  initialFollowing: boolean;
  initialFollowersCount: number;
  initialMembershipStatus: "active" | "pending" | null;
  initialRole: "owner" | "admin" | "editor" | "member" | null;
  canJoinPublic: boolean;
};

export function OrganizationEngagementActions({
  locale,
  slug,
  isAuthenticated,
  initialFollowing,
  initialFollowersCount,
  initialMembershipStatus,
  initialRole,
  canJoinPublic,
}: OrganizationEngagementActionsProps) {
  const router = useRouter();
  const [membershipStatus, setMembershipStatus] = useState<"active" | "pending" | null>(initialMembershipStatus);
  const [role, setRole] = useState<"owner" | "admin" | "editor" | "member" | null>(initialRole);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const canLeave = membershipStatus === "active" && role !== "owner";
  const shouldShowJoin = canJoinPublic && membershipStatus !== "active";

  async function joinCommunity() {
    if (!isAuthenticated) {
      router.push(`/${locale}/entrar`);
      return;
    }

    if (submittingJoin) {
      return;
    }

    setSubmittingJoin(true);

    try {
      const response = await fetch(`/api/organizations/${slug}/membership`, {
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      setMembershipStatus("active");
      setRole("member");
    } finally {
      setSubmittingJoin(false);
    }
  }

  async function leaveCommunity() {
    if (submittingLeave) {
      return;
    }

    setSubmittingLeave(true);

    try {
      const response = await fetch(`/api/organizations/${slug}/membership`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      setMembershipStatus(null);
      setRole(null);
    } finally {
      setSubmittingLeave(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <FollowOrganizationButton
          slug={slug}
          isAuthenticated={isAuthenticated}
          initialFollowing={initialFollowing}
          initialFollowersCount={initialFollowersCount}
          onFollowersCountChange={setFollowersCount}
        />

        {shouldShowJoin ? (
          <Button
            type="button"
            variant="neutral"
            onClick={() => void joinCommunity()}
            disabled={submittingJoin}
            className="cursor-pointer"
          >
            {submittingJoin ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Entrar comunidade
          </Button>
        ) : null}

        {canLeave ? (
          <Button
            type="button"
            variant="neutral"
            onClick={() => void leaveCommunity()}
            disabled={submittingLeave}
            className="cursor-pointer"
          >
            {submittingLeave ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sair da comunidade
          </Button>
        ) : null}
      </div>

      <span className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-black/5 px-3 text-xs font-semibold text-black/70">
        <Users size={14} />
        <strong className="text-[var(--color-ink)]">{compactNumberFormatter.format(followersCount)}</strong>
        inscritos
      </span>
    </div>
  );
}
