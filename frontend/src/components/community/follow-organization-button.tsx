"use client";

import { useState } from "react";
import { Loader2, Plus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FollowOrganizationButtonProps = {
  slug: string;
  isAuthenticated: boolean;
  initialFollowing: boolean;
  initialFollowersCount: number;
  className?: string;
  containerClassName?: string;
  onFollowersCountChange?: (nextCount: number) => void;
  showFollowersCount?: boolean;
};

export function FollowOrganizationButton({
  slug,
  isAuthenticated,
  initialFollowing,
  initialFollowersCount,
  className,
  containerClassName,
  onFollowersCountChange,
  showFollowersCount = false,
}: FollowOrganizationButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  async function toggleFollow() {
    if (loading) {
      return;
    }

    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/organizations/${slug}/follow`, {
        method,
      });

      if (!response.ok) {
        return;
      }

      setIsFollowing((current) => {
        const next = !current;
        setFollowersCount((value) => {
          const nextCount = Math.max(0, value + (next ? 1 : -1));
          onFollowersCountChange?.(nextCount);
          return nextCount;
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("inline-flex items-center gap-2", containerClassName)}>
      <Button
        type="button"
        onClick={toggleFollow}
        variant={isFollowing ? "soft" : "neutral"}
        className={className}
        disabled={loading}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <UsersRound size={14} /> : <Plus size={14} />}
        {isFollowing ? "Seguindo" : "Seguir comunidade"}
      </Button>
      {showFollowersCount ? (
        <span className="rounded-[6px] bg-black/5 px-2 py-1 text-xs text-black/70">
          <strong className="text-[var(--color-ink)]">{followersCount}</strong> seguidores
        </span>
      ) : null}
    </div>
  );
}
