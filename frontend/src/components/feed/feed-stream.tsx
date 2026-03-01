"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { PostCard } from "@/components/feed/post-card";
import { PostCardSkeleton } from "@/components/feed/post-card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/lib/i18n";
import type { Post } from "@/types/api";

type FeedStreamProps = {
  locale: Locale;
  isAuthenticated: boolean;
  initialPosts: Post[];
  initialPage: number;
  initialLastPage: number;
};

export function FeedStream({
  locale,
  isAuthenticated,
  initialPosts,
  initialPage,
  initialLastPage,
}: FeedStreamProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
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
        setLoadingMore(true);

        fetch(`/api/posts/feed?page=${nextPage}&per_page=12`)
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as {
              data?: Post[];
              current_page?: number;
              last_page?: number;
            };
          })
          .then((payload) => {
            if (!payload) {
              return;
            }

            const nextPosts = payload.data ?? [];
            setPosts((current) => [...current, ...nextPosts]);
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
  }, [hasMore, loadingMore, page, lastPage]);

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <EmptyState
          title="Feed vazio no momento"
          description={
            isAuthenticated
              ? "Ainda não existem episódios públicos para mostrar."
              : "Ainda não existem episódios públicos para mostrar. Entre ou crie uma conta para começar."
          }
        />
      ) : (
        posts.map((post, index) => (
          <div
            key={post.id}
            className="feed-card-enter"
            style={
              {
                "--feed-enter-delay": `${(index % 8) * 55}ms`,
              } as CSSProperties
            }
          >
            <PostCard post={post} locale={locale} isAuthenticated={isAuthenticated} />
          </div>
        ))
      )}

      <div ref={sentinelRef} className="h-4 w-full" />

      {loadingMore ? (
        <div className="space-y-3">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : null}
    </div>
  );
}
