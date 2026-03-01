"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PencilLine, ShieldCheck, UserPlus, Users2 } from "lucide-react";

import { CommunityCardSkeleton } from "@/components/community/community-card-skeleton";
import { FollowOrganizationButton } from "@/components/community/follow-organization-button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/api";
import type { Organization } from "@/types/api";

type CommunitiesStreamProps = {
  locale: string;
  isAuthenticated: boolean;
  initialItems: Organization[];
  initialPage: number;
  initialLastPage: number;
  query: {
    q?: string;
    sort?: string;
  };
};

export function CommunitiesStream({
  locale,
  isAuthenticated,
  initialItems,
  initialPage,
  initialLastPage,
  query,
}: CommunitiesStreamProps) {
  const [items, setItems] = useState<Organization[]>(initialItems);
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

        if (query.sort && query.sort !== "recent") {
          params.set("sort", query.sort);
        }

        setLoadingMore(true);

        fetch(`/api/organizations/list?${params.toString()}`)
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as {
              data?: Organization[];
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
  }, [hasMore, lastPage, loadingMore, page, query.q, query.sort]);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((organization) => {

        return (
          <Card key={organization.id}>
            <CardBody className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={resolveMediaUrl(organization.avatar_path) ?? "/default-org-avatar.svg"}
                  name={organization.name}
                  size="lg"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{organization.name}</p>
                      <p className="line-clamp-1 text-xs text-black/55">@{organization.slug}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-black/65">
                      <span className="rounded-[6px] bg-black/5 px-2 py-1">
                        <strong className="text-[var(--color-ink)]">{organization.followers_count ?? 0}</strong> seguidores
                      </span>
                      <span className="rounded-[6px] bg-black/5 px-2 py-1">
                        <strong className="text-[var(--color-ink)]">{organization.playlists_count ?? 0}</strong> playlists
                      </span>
                      <span className="rounded-[6px] bg-black/5 px-2 py-1">
                        <strong className="text-[var(--color-ink)]">{organization.posts_count ?? 0}</strong> episódios
                      </span>
                    </div>
                  </div>

                  {organization.is_verified ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-[6px] bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck size={12} />
                      Verificada
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="line-clamp-2 text-sm text-black/65">{organization.description ?? "Sem descrição."}</p>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${locale}/organizations/${organization.slug}`}
                  className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-5 text-sm font-semibold text-[var(--color-ink)]"
                >
                  <Users2 size={15} />
                  Ver comunidade
                </Link>

                {organization.viewer?.role === "owner" ? (
                  <>
                    <Link
                      href={`/${locale}/organizations/${organization.slug}/editar`}
                      className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-5 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      <PencilLine size={15} />
                      Editar comunidade
                    </Link>
                    <Link
                      href={`/${locale}/organizations/${organization.slug}/convidar`}
                      className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-5 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      <UserPlus size={15} />
                      Convidar
                    </Link>
                  </>
                ) : organization.viewer?.role === "admin" ? (
                  <>
                    <Link
                      href={`/${locale}/organizations/${organization.slug}/convidar`}
                      className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-5 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      <UserPlus size={15} />
                      Convidar
                    </Link>
                  </>
                ) : (
                  <FollowOrganizationButton
                    slug={organization.slug}
                    isAuthenticated={isAuthenticated}
                    initialFollowing={organization.viewer?.is_following ?? false}
                    initialFollowersCount={organization.followers_count ?? 0}
                  />
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}

      <div ref={sentinelRef} className="h-4 w-full" />

      {loadingMore ? (
        <div className="space-y-3">
          <CommunityCardSkeleton />
          <CommunityCardSkeleton />
        </div>
      ) : null}
    </div>
  );
}
