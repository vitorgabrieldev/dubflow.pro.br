"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronRight, Layers3, PlayCircle } from "lucide-react";

import { PlaylistRowSkeleton } from "@/components/playlist/playlist-row-skeleton";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/api";
import type { Playlist, PlaylistSeason, Post } from "@/types/api";

type PlaylistsStreamProps = {
  locale: string;
  initialItems: Playlist[];
  initialPage: number;
  initialLastPage: number;
  query: {
    q?: string;
    sort?: string;
    organization?: string;
    user?: string;
  };
};

type PlaylistEpisodesPayload = {
  seasons?: PlaylistSeason[];
  episodes?: Post[];
};

const PICKER_ANIMATION_MS = 180;

export function PlaylistsStream({
  locale,
  initialItems,
  initialPage,
  initialLastPage,
  query,
}: PlaylistsStreamProps) {
  const router = useRouter();
  const [items, setItems] = useState<Playlist[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [lastPage, setLastPage] = useState(initialLastPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openPickerId, setOpenPickerId] = useState<number | null>(null);
  const [closingPickerId, setClosingPickerId] = useState<number | null>(null);
  const [episodesByPlaylist, setEpisodesByPlaylist] = useState<Record<number, PlaylistEpisodesPayload>>({});
  const [loadingEpisodesFor, setLoadingEpisodesFor] = useState<number | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pickerCloseTimerRef = useRef<number | null>(null);

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

        if (query.organization) {
          params.set("organization", query.organization);
        }

        if (query.user) {
          params.set("user", query.user);
        }

        if (query.sort && query.sort !== "recent") {
          params.set("sort", query.sort);
        }

        setLoadingMore(true);

        fetch(`/api/playlists/list?${params.toString()}`)
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as {
              data?: Playlist[];
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
  }, [hasMore, lastPage, loadingMore, page, query.organization, query.q, query.sort, query.user]);

  function closeWatchPicker(playlistId: number) {
    if (typeof window === "undefined") {
      setOpenPickerId((current) => (current === playlistId ? null : current));
      setClosingPickerId((current) => (current === playlistId ? null : current));
      return;
    }

    if (pickerCloseTimerRef.current) {
      window.clearTimeout(pickerCloseTimerRef.current);
    }

    setClosingPickerId(playlistId);
    pickerCloseTimerRef.current = window.setTimeout(() => {
      setOpenPickerId((current) => (current === playlistId ? null : current));
      setClosingPickerId((current) => (current === playlistId ? null : current));
      pickerCloseTimerRef.current = null;
    }, PICKER_ANIMATION_MS);
  }

  async function toggleWatchPicker(playlist: Playlist) {
    if (!playlist.organization?.slug) {
      return;
    }

    if (openPickerId === playlist.id && closingPickerId !== playlist.id) {
      closeWatchPicker(playlist.id);
      return;
    }

    if (typeof window !== "undefined" && pickerCloseTimerRef.current) {
      window.clearTimeout(pickerCloseTimerRef.current);
      pickerCloseTimerRef.current = null;
    }

    setClosingPickerId(null);
    setOpenPickerId(playlist.id);

    if (episodesByPlaylist[playlist.id]) {
      return;
    }

    setLoadingEpisodesFor(playlist.id);

    try {
      const response = await fetch(`/api/playlists/${playlist.organization.slug}/${playlist.id}/episodes`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PlaylistEpisodesPayload;
      setEpisodesByPlaylist((current) => ({
        ...current,
        [playlist.id]: payload,
      }));

      const firstSeason = [...(payload.seasons ?? [])].sort((a, b) => a.season_number - b.season_number)[0];
      if (firstSeason) {
        setExpandedSeasons((current) => ({
          ...current,
          [`${playlist.id}:${firstSeason.season_number}`]: true,
        }));
      }
    } finally {
      setLoadingEpisodesFor((current) => (current === playlist.id ? null : current));
    }
  }

  function toggleSeason(playlistId: number, seasonNumber: number) {
    const key = `${playlistId}:${seasonNumber}`;
    setExpandedSeasons((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function playEpisode(playlist: Playlist, episodeId: number) {
    if (!playlist.organization?.slug) {
      return;
    }

    router.push(`/${locale}/playlists/${playlist.organization.slug}/${playlist.id}/watch?episode=${episodeId}`);
  }

  useEffect(() => {
    return () => {
      if (pickerCloseTimerRef.current) {
        window.clearTimeout(pickerCloseTimerRef.current);
      }
    };
  }, []);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((playlist) => (
        <Card key={playlist.id}>
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-[6px] bg-[linear-gradient(135deg,#40186b_0%,#9333ea_100%)]">
                {playlist.organization?.avatar_path ? (
                  <Image
                    src={resolveMediaUrl(playlist.organization.avatar_path) ?? ""}
                    alt={playlist.organization?.name ?? "Playlist"}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                ) : null}

                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[6px] bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Playlist
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {(() => {
                  const shouldRenderPicker = openPickerId === playlist.id || closingPickerId === playlist.id;
                  const isPickerVisible = openPickerId === playlist.id && closingPickerId !== playlist.id;

                  return (
                    <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{playlist.title}</p>
                    <p className="line-clamp-1 text-xs text-black/60">
                      {playlist.organization?.name ?? "-"} • {playlist.organization?.owner?.name ?? "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-black/65">
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{playlist.posts_count ?? 0}</strong> Episódios
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <Layers3 size={11} className="mr-1 inline-flex" />
                      <strong className="text-[var(--color-ink)]">{playlist.seasons_count ?? "-"}</strong> Temporadas
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <CalendarDays size={11} className="mr-1 inline-flex" />
                      {formatCreatedAt(playlist.created_at)}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-black/65">{playlist.description ?? "Sem descrição."}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {playlist.organization?.slug ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void toggleWatchPicker(playlist)}
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[6px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
                      >
                        <PlayCircle size={14} />
                        Assistir
                        <ChevronDown size={14} />
                      </button>
                      <Link
                        href={`/${locale}/playlists/${playlist.organization.slug}/${playlist.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-4 text-sm font-semibold text-[var(--color-ink)]"
                      >
                        <PlayCircle size={14} />
                        Ver playlist
                      </Link>
                    </>
                  ) : (
                    <span className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-4 text-sm font-semibold text-black/50">
                      <PlayCircle size={14} />
                      Ver playlist
                    </span>
                  )}
                </div>

                {shouldRenderPicker ? (
                  <div
                    className={`origin-top rounded-[10px] border border-black/10 bg-white p-2 transition-all duration-180 ease-out ${
                      isPickerVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-[0.98] opacity-0"
                    }`}
                  >
                    {loadingEpisodesFor === playlist.id ? (
                      <EpisodesDropdownSkeleton />
                    ) : (
                      (() => {
                        const payload = episodesByPlaylist[playlist.id];
                        const seasons = [...(payload?.seasons ?? [])].sort((a, b) => a.season_number - b.season_number);
                        const episodes = payload?.episodes ?? [];

                        if (seasons.length === 0 || episodes.length === 0) {
                          return <p className="px-2 py-4 text-sm text-black/60">Sem episódios disponíveis.</p>;
                        }

                        return (
                          <div className="max-h-[360px] space-y-2 overflow-y-auto">
                            {seasons.map((season) => {
                              const seasonEpisodes = episodes
                                .filter((episode) => (episode.season?.season_number ?? 1) === season.season_number)
                                .sort((a, b) => a.id - b.id);
                              const key = `${playlist.id}:${season.season_number}`;
                              const isExpanded = expandedSeasons[key] ?? season.season_number === seasons[0]?.season_number;

                              return (
                                <div key={season.id} className="rounded-[8px] border border-black/10">
                                  <button
                                    type="button"
                                    onClick={() => toggleSeason(playlist.id, season.season_number)}
                                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
                                  >
                                    <span className="text-sm font-semibold text-[var(--color-ink)]">
                                      Temporada {season.season_number}
                                      {season.title ? ` • ${season.title}` : ""}
                                    </span>
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>

                                  {isExpanded ? (
                                    <div className="space-y-2 border-t border-black/10 p-2">
                                      {seasonEpisodes.map((episode) => {
                                        const thumbUrl =
                                          resolveMediaUrl(episode.thumbnail_path)
                                          ?? (episode.media_type === "image" ? resolveMediaUrl(episode.media_path) : null);

                                        return (
                                          <button
                                            key={episode.id}
                                            type="button"
                                            onClick={() => playEpisode(playlist, episode.id)}
                                            className="flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-black/10 p-2 text-left transition hover:bg-black/[0.03]"
                                          >
                                            <div className="h-16 w-28 shrink-0 overflow-hidden rounded-[6px] bg-black/10">
                                              {thumbUrl ? (
                                                <Image
                                                  src={thumbUrl}
                                                  alt={episode.title}
                                                  width={112}
                                                  height={64}
                                                  sizes="112px"
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-black/55">
                                                  Sem thumb
                                                </div>
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{episode.title}</p>
                                              <p className="line-clamp-2 text-xs text-black/65">
                                                {episode.description?.trim() || "Sem descrição para este episódio."}
                                              </p>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}

      <div ref={sentinelRef} className="h-4 w-full" />

      {loadingMore ? (
        <div className="space-y-3">
          <PlaylistRowSkeleton />
          <PlaylistRowSkeleton />
        </div>
      ) : null}
    </div>
  );
}

function EpisodesDropdownSkeleton() {
  return (
    <div className="space-y-3 p-1">
      <div className="rounded-[8px] border border-black/10 p-2">
        <Skeleton className="h-5 w-40 rounded-[6px]" />
        <div className="mt-2 space-y-2 border-t border-black/10 pt-2">
          <div className="flex items-start gap-3 rounded-[8px] border border-black/10 p-2">
            <Skeleton className="h-16 w-28 shrink-0 rounded-[6px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-4/5 rounded-[6px]" />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[8px] border border-black/10 p-2">
            <Skeleton className="h-16 w-28 shrink-0 rounded-[6px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-3/4 rounded-[6px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCreatedAt(createdAt?: string) {
  if (!createdAt) {
    return "-";
  }

  const value = new Date(createdAt);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("pt-BR");
}
