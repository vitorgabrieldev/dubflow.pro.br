"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Loader2, PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DubbingTest, DubbingTestStatus } from "@/types/api";

type OrganizationDubbingTestsListProps = {
  locale: string;
  organizationSlug: string;
  canManage: boolean;
  initialItems: DubbingTest[];
  initialPage: number;
  initialLastPage: number;
};

export function OrganizationDubbingTestsList({
  locale,
  organizationSlug,
  canManage,
  initialItems,
  initialPage,
  initialLastPage,
}: OrganizationDubbingTestsListProps) {
  const [items, setItems] = useState<DubbingTest[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [lastPage, setLastPage] = useState(initialLastPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMore = useMemo(() => page < lastPage, [lastPage, page]);

  async function loadMore() {
    if (!hasMore || loadingMore) {
      return;
    }

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/dubbing-tests?page=${nextPage}&per_page=3`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        data?: DubbingTest[];
        current_page?: number;
        last_page?: number;
      };

      setItems((current) => [...current, ...(payload.data ?? [])]);
      setPage(payload.current_page ?? nextPage);
      setLastPage(payload.last_page ?? lastPage);
    } finally {
      setLoadingMore(false);
    }
  }

  async function removeTest(testId: number) {
    setRemovingId(testId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/dubbing-tests/${testId}/delete`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível remover o teste.");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== testId));
      setFeedback(payload.message ?? "Teste removido com sucesso.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {feedback ? (
        <p className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>
      ) : null}

      {error ? (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/60">
          Nenhum teste de dublagem publicado nesta comunidade.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((test) => {
            const isLocked = test.status === "closed" || test.status === "results_released";

            return (
              <article
                key={test.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-black/10 bg-white px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{test.title}</p>
                  <p className="text-xs text-black/55">
                    Status: {labelTestStatus(test.status)} • {test.characters_count ?? 0} personagens • {test.submissions_count ?? 0} inscrições
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/${locale}/oportunidades/${test.id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-black/15 bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                  >
                    <Eye size={13} />
                    Visualizar
                  </Link>

                  {canManage && !isLocked ? (
                    <Link
                      href={`/${locale}/organizations/${organizationSlug}/oportunidades/${test.id}/editar`}
                      className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-black/15 bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                    >
                      <PencilLine size={13} />
                      Editar
                    </Link>
                  ) : null}

                  {canManage && isLocked ? (
                    <Button
                      type="button"
                      variant="neutral"
                      size="md"
                      className="h-9 border-red-200 bg-red-50 px-3 text-xs text-red-700 hover:bg-red-100"
                      disabled={removingId === test.id}
                      onClick={() => removeTest(test.id)}
                    >
                      {removingId === test.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Remover
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <Button type="button" variant="neutral" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
          {loadingMore ? "Carregando..." : "Carregar mais testes"}
        </Button>
      ) : null}
    </div>
  );
}

function labelTestStatus(value: DubbingTestStatus) {
  switch (value) {
    case "draft":
      return "Rascunho";
    case "published":
      return "Publicado";
    case "closed":
      return "Encerrado";
    case "results_released":
      return "Resultados liberados";
    case "archived":
      return "Arquivado";
    default:
      return value;
  }
}
