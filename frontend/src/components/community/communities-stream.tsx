"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { CommunityCardSkeleton } from "@/components/community/community-card-skeleton";
import { FollowOrganizationButton } from "@/components/community/follow-organization-button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/api";
import type { Organization } from "@/types/api";

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type CommunitiesStreamProps = {
  locale: string;
  isAuthenticated: boolean;
  initialItems: Organization[];
  initialPage: number;
  initialLastPage: number;
  query: {
    q?: string;
    sort?: string;
    excludeJoined?: boolean;
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
  const router = useRouter();

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

        if (query.excludeJoined) {
          params.set("exclude_joined", "1");
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
  }, [hasMore, lastPage, loadingMore, page, query.excludeJoined, query.q, query.sort, router]);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((organization) => {
        const href = `/${locale}/organizations/${organization.slug}`;
        const followersLabel = compactNumberFormatter.format(organization.followers_count ?? 0);

        return (
          <Card
            key={organization.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(href)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              router.push(href);
            }}
            className="cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-34px_rgba(76,16,140,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <CardBody className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="flex min-w-0 items-center gap-4 sm:flex-1 sm:gap-5">
                  <Avatar
                    src={resolveMediaUrl(organization.avatar_path) ?? "/default-org-avatar.svg"}
                    name={organization.name}
                    size="lg"
                    className="h-[76px] w-[76px] shrink-0 rounded-full border-2 border-black/10 bg-white sm:h-[104px] sm:w-[104px]"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-[var(--color-ink)] sm:text-xl">
                      <span className="line-clamp-1">{organization.name}</span>
                      {organization.is_verified ? <ShieldCheck size={15} className="shrink-0 text-black/45" /> : null}
                    </p>

                    <p className="line-clamp-1 text-xs text-black/60 sm:text-sm">
                      @{organization.slug} • {followersLabel} seguidores
                    </p>

                    <p className="line-clamp-2 text-sm text-black/72">
                      {organization.description ?? "Sem descrição."}
                    </p>
                  </div>
                </div>

                <div
                  className="w-full sm:w-auto"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {!organization.viewer?.role ? (
                    <FollowOrganizationButton
                      slug={organization.slug}
                      isAuthenticated={isAuthenticated}
                      initialFollowing={organization.viewer?.is_following ?? false}
                      initialFollowersCount={organization.followers_count ?? 0}
                      containerClassName="flex w-full sm:inline-flex sm:w-auto"
                      className="h-10 w-full justify-center rounded-full px-5 sm:w-auto"
                    />
                  ) : null}
                </div>
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
