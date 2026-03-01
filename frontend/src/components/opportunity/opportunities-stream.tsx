"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Mic2, UsersRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/api";
import type { DubbingTest } from "@/types/api";

type OpportunitiesStreamProps = {
  locale: string;
  initialItems: DubbingTest[];
  initialPage: number;
  initialLastPage: number;
  query: {
    q?: string;
    visibility?: "internal" | "external";
    appearance?: "protagonista" | "coadjuvante" | "pontas" | "figurante" | "voz_adicional";
  };
};

export function OpportunitiesStream({
  locale,
  initialItems,
  initialPage,
  initialLastPage,
  query,
}: OpportunitiesStreamProps) {
  const [items, setItems] = useState<DubbingTest[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [lastPage, setLastPage] = useState(initialLastPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => page < lastPage, [page, lastPage]);

  useEffect(() => {
    if (!hasMore || loadingMore) {
      return;
    }

    const target = sentinelRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loadingMore) {
          return;
        }

        const nextPage = page + 1;
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: "12",
        });

        if (query.q) {
          params.set("q", query.q);
        }

        if (query.visibility) {
          params.set("visibility", query.visibility);
        }

        if (query.appearance) {
          params.set("appearance", query.appearance);
        }

        setLoadingMore(true);

        fetch(`/api/dubbing-tests/opportunities?${params.toString()}`)
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as {
              data?: DubbingTest[];
              current_page?: number;
              last_page?: number;
            };
          })
          .then((payload) => {
            if (!payload) {
              return;
            }

            const nextItems = payload.data ?? [];
            setItems((current) => [...current, ...nextItems]);
            setPage(payload.current_page ?? nextPage);
            setLastPage(payload.last_page ?? lastPage);
          })
          .finally(() => {
            setLoadingMore(false);
          });
      },
      {
        rootMargin: "700px 0px",
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, lastPage, loadingMore, page, query.appearance, query.q, query.visibility]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma oportunidade encontrada"
        description="Ajuste os filtros ou volte mais tarde para ver novos testes de dublagem."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((test) => {
        const organization = test.organization;
        const characters = test.characters ?? [];
        const endsAt = formatDate(test.ends_at);
        const resultsAt = formatDate(test.results_release_at);

        return (
          <Card key={test.id}>
            <CardBody className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={resolveMediaUrl(organization?.avatar_path) ?? "/default-org-avatar.svg"}
                  name={organization?.name ?? "Comunidade"}
                  size="lg"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{test.title}</p>
                    <span
                      className={`rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${
                        test.visibility === "internal"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {test.visibility === "internal" ? "Interno" : "Externo"}
                    </span>
                  </div>

                  <p className="line-clamp-1 text-xs text-black/60">
                    {organization?.name ?? "Comunidade"} • @{organization?.slug ?? "-"}
                  </p>
                </div>
              </div>

              <p className="line-clamp-2 text-sm text-black/65">{test.description ?? "Sem descrição."}</p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/70">
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
                  <UsersRound size={11} />
                  {test.submissions_count ?? 0} inscrições
                </span>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
                  <Mic2 size={11} />
                  {test.characters_count ?? characters.length} personagens
                </span>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
                  <CalendarClock size={11} />
                  Encerramento: {endsAt}
                </span>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
                  Resultado: {resultsAt}
                </span>
              </div>

              {characters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {characters.slice(0, 5).map((character) => (
                    <span
                      key={character.id}
                      className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[11px] text-black/65"
                    >
                      {character.name} • {labelAppearance(character.appearance_estimate)}
                    </span>
                  ))}
                  {characters.length > 5 ? (
                    <span className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[11px] text-black/65">
                      +{characters.length - 5} personagens
                    </span>
                  ) : null}
                </div>
              ) : null}

              <Link
                href={`/${locale}/oportunidades/${test.id}`}
                className="inline-flex h-10 items-center rounded-[8px] border border-black/15 px-4 text-sm font-semibold text-[var(--color-ink)]"
              >
                Ver oportunidade
              </Link>
            </CardBody>
          </Card>
        );
      })}

      <div ref={sentinelRef} className="h-4 w-full" />

      {loadingMore ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function labelAppearance(value?: string) {
  switch (value) {
    case "protagonista":
      return "Protagonista";
    case "coadjuvante":
      return "Coadjuvante";
    case "pontas":
      return "Pontas";
    case "figurante":
      return "Figurante";
    case "voz_adicional":
      return "Voz adicional";
    default:
      return "-";
  }
}
