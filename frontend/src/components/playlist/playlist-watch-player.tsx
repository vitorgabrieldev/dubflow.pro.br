"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/lib/i18n";
import type { Post } from "@/types/api";
import {
  buildQueue,
  buildSeasonGroups,
  resolveEpisodePreviewImage,
  resolveEpisodePreviewVideo,
  type SeasonGroup,
} from "@/components/playlist/playlist-watch-shared";

type PlaylistWatchPlayerProps = {
  locale: Locale;
  organizationSlug: string;
  playlistId: string;
  posts: Post[];
  autoStart?: boolean;
  initialEpisodeId?: number | null;
};

const PICKER_ANIMATION_MS = 180;
const PICKER_SKELETON_MS = 220;

export function PlaylistWatchPlayer({
  locale,
  organizationSlug,
  playlistId,
  posts,
  autoStart = false,
  initialEpisodeId = null,
}: PlaylistWatchPlayerProps) {
  const router = useRouter();
  const queue = useMemo(() => buildQueue(posts), [posts]);
  const seasonGroups = useMemo<SeasonGroup[]>(() => buildSeasonGroups(posts, queue), [posts, queue]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isPickerClosing, setIsPickerClosing] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({});
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerCloseTimerRef = useRef<number | null>(null);
  const pickerLoadTimerRef = useRef<number | null>(null);
  const hasAutoStartedRef = useRef(false);

  const shouldRenderPicker = isPickerOpen || isPickerClosing;
  const isPickerVisible = isPickerOpen && !isPickerClosing;

  const episodeById = useMemo(() => {
    const map = new Map<number, Post>();
    for (const post of posts) {
      map.set(post.id, post);
    }
    return map;
  }, [posts]);

  const initialIndex = useMemo(() => {
    if (!initialEpisodeId) {
      return 0;
    }

    const foundIndex = queue.findIndex((item) => item.id === initialEpisodeId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [initialEpisodeId, queue]);

  const openWatchScreen = useCallback((episodeId: number) => {
    router.push(`/${locale}/playlists/${organizationSlug}/${playlistId}/watch?episode=${episodeId}`);
  }, [locale, organizationSlug, playlistId, router]);

  const closePicker = useCallback(() => {
    if ((!isPickerOpen && !isPickerClosing) || typeof window === "undefined") {
      return;
    }

    if (pickerCloseTimerRef.current) {
      window.clearTimeout(pickerCloseTimerRef.current);
    }

    setIsPickerClosing(true);
    pickerCloseTimerRef.current = window.setTimeout(() => {
      setIsPickerOpen(false);
      setIsPickerClosing(false);
      setIsPickerLoading(false);
      pickerCloseTimerRef.current = null;
    }, PICKER_ANIMATION_MS);
  }, [isPickerClosing, isPickerOpen]);

  useEffect(() => {
    if (!autoStart || queue.length === 0 || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    openWatchScreen(queue[Math.max(0, initialIndex)]?.id ?? queue[0].id);
  }, [autoStart, initialIndex, openWatchScreen, queue]);

  useEffect(() => {
    if (!shouldRenderPicker) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !pickerRef.current) {
        return;
      }

      if (pickerRef.current.contains(target)) {
        return;
      }

      closePicker();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closePicker, shouldRenderPicker]);

  useEffect(() => {
    return () => {
      if (pickerCloseTimerRef.current) {
        window.clearTimeout(pickerCloseTimerRef.current);
      }
      if (pickerLoadTimerRef.current) {
        window.clearTimeout(pickerLoadTimerRef.current);
      }
    };
  }, []);

  function openPicker() {
    if (typeof window !== "undefined" && pickerCloseTimerRef.current) {
      window.clearTimeout(pickerCloseTimerRef.current);
      pickerCloseTimerRef.current = null;
    }

    setIsPickerClosing(false);
    setIsPickerOpen(true);

    if (seasonGroups.length > 0 && Object.keys(expandedSeasons).length === 0) {
      setExpandedSeasons({ [seasonGroups[0].seasonNumber]: true });
    }

    if (typeof window !== "undefined") {
      if (pickerLoadTimerRef.current) {
        window.clearTimeout(pickerLoadTimerRef.current);
      }
      setIsPickerLoading(true);
      pickerLoadTimerRef.current = window.setTimeout(() => {
        setIsPickerLoading(false);
        pickerLoadTimerRef.current = null;
      }, PICKER_SKELETON_MS);
    }
  }

  function togglePicker() {
    if (isPickerOpen && !isPickerClosing) {
      closePicker();
      return;
    }

    openPicker();
  }

  function toggleSeason(seasonNumber: number) {
    setExpandedSeasons((current) => ({
      ...current,
      [seasonNumber]: !current[seasonNumber],
    }));
  }

  function playEpisode(episodeId: number) {
    if (typeof window !== "undefined") {
      if (pickerCloseTimerRef.current) {
        window.clearTimeout(pickerCloseTimerRef.current);
        pickerCloseTimerRef.current = null;
      }
      if (pickerLoadTimerRef.current) {
        window.clearTimeout(pickerLoadTimerRef.current);
        pickerLoadTimerRef.current = null;
      }
    }

    setIsPickerOpen(false);
    setIsPickerClosing(false);
    setIsPickerLoading(false);
    openWatchScreen(episodeId);
  }

  return (
    <div ref={pickerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={togglePicker} disabled={queue.length === 0} className="h-10 px-4">
          <PlayCircle size={15} />
          Assistir
          <ChevronDown size={14} />
        </Button>
        {queue.length === 0 ? (
          <span className="text-xs text-black/55">Nenhum episódio com mídia reproduzível encontrado.</span>
        ) : null}
      </div>

      {shouldRenderPicker ? (
        <div
          className={`absolute left-0 top-12 z-[120] w-full min-w-[320px] max-w-[780px] origin-top rounded-[12px] border border-black/10 bg-white p-3 shadow-[0_24px_56px_-34px_rgba(0,0,0,0.35)] transition-all duration-180 ease-out ${
            isPickerVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-[0.98] opacity-0"
          }`}
        >
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {isPickerLoading ? (
              <EpisodePickerSkeleton />
            ) : seasonGroups.length === 0 ? (
              <p className="rounded-[8px] bg-black/5 px-3 py-2 text-sm text-black/60">
                Nenhum episódio disponível para reprodução.
              </p>
            ) : (
              seasonGroups.map((group) => {
                const isExpanded = expandedSeasons[group.seasonNumber] ?? group.seasonNumber === seasonGroups[0]?.seasonNumber;

                return (
                  <div key={group.seasonNumber} className="rounded-[10px] border border-black/10 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleSeason(group.seasonNumber)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
                    >
                      <span className="text-sm font-semibold text-[var(--color-ink)]">
                        Temporada {group.seasonNumber}
                        {group.seasonTitle ? ` • ${group.seasonTitle}` : ""}
                      </span>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {isExpanded ? (
                      <div className="space-y-2 border-t border-black/10 p-2">
                        {group.items.map((item) => {
                          const episode = episodeById.get(item.id);
                          const thumbUrl = resolveEpisodePreviewImage(episode);
                          const previewVideoUrl = thumbUrl ? null : resolveEpisodePreviewVideo(episode);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => playEpisode(item.id)}
                              className="flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-black/10 bg-white p-2 text-left transition hover:bg-black/[0.03]"
                            >
                              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-[8px] bg-black/10">
                                <EpisodeThumb
                                  key={`${item.id}:${thumbUrl ?? "none"}:${previewVideoUrl ?? "none"}`}
                                  imageUrl={thumbUrl}
                                  videoUrl={previewVideoUrl}
                                  title={item.title}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                                <p className="line-clamp-2 text-xs text-black/65">
                                  {episode?.description?.trim() || "Sem descrição para este episódio."}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EpisodePickerSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-black/10 p-2">
        <Skeleton className="h-5 w-36 rounded-[6px]" />
        <div className="mt-2 space-y-2 border-t border-black/10 pt-2">
          <div className="flex items-start gap-3 rounded-[10px] border border-black/10 p-2">
            <Skeleton className="h-16 w-28 shrink-0 rounded-[8px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-4/5 rounded-[6px]" />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[10px] border border-black/10 p-2">
            <Skeleton className="h-16 w-28 shrink-0 rounded-[8px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-3/4 rounded-[6px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpisodeThumb({
  imageUrl,
  videoUrl,
  title,
}: {
  imageUrl: string | null;
  videoUrl: string | null;
  title: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <Image
        src={imageUrl}
        alt={title}
        width={112}
        height={64}
        sizes="112px"
        unoptimized
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  if (videoUrl && !videoFailed) {
    return (
      <video
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        onError={() => setVideoFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-black/55">Sem thumb</div>;
}
