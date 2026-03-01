"use client";

import { useState } from "react";
import { Loader2, Plus, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

type FollowUserButtonProps = {
  userId: number;
  isAuthenticated: boolean;
  canFollow: boolean;
  initialFollowing: boolean;
};

export function FollowUserButton({
  userId,
  isAuthenticated,
  canFollow,
  initialFollowing,
}: FollowUserButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !canFollow) {
    return null;
  }

  async function toggleFollow() {
    if (loading) {
      return;
    }

    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method,
      });

      if (!response.ok) {
        return;
      }

      setIsFollowing((current) => !current);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant={isFollowing ? "soft" : "neutral"} onClick={toggleFollow} disabled={loading}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <UserCheck size={14} /> : <Plus size={14} />}
      {isFollowing ? "Seguindo" : "Seguir"}
    </Button>
  );
}

