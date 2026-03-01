"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PostManagementActions({
  locale,
  postId,
  isAuthenticated,
  canEdit,
  canDelete,
}: {
  locale: string;
  postId: number;
  isAuthenticated: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || (!canEdit && !canDelete)) {
    return null;
  }

  async function handleDelete() {
    if (deleting) {
      return;
    }

    const confirmed = window.confirm("Tem certeza que deseja excluir este episódio?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; already_deleted?: boolean };
      if (response.status === 404 || payload.already_deleted) {
        router.push(`/${locale}`);
        router.refresh();
        return;
      }

      if (!response.ok) {
        setError(payload.message ?? "Não foi possível excluir este episódio.");
        return;
      }

      router.push(`/${locale}`);
      router.refresh();
    } catch {
      setError("Não foi possível excluir este episódio.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Link href={`/${locale}/post/${postId}/editar`} className="inline-flex">
            <Button type="button" variant="soft">
              <PencilLine size={14} />
              Editar episódio
            </Button>
          </Link>
        ) : null}

        {canDelete ? (
          <Button type="button" variant="neutral" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir episódio
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
