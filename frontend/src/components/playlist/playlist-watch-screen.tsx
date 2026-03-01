"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Clapperboard, Loader2, Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import type { Post } from "@/types/api";
import {
  buildQueue,
  buildSeasonGroups,
  formatDuration,
  NEXT_EPISODE_THRESHOLD_SECONDS,
  PRELOAD_NEXT_EPISODE_THRESHOLD_SECONDS,
  readProgress,
  tryPlayMedia,
  type QueueItem,
  type SeasonGroup,
  writeProgress,
} from "@/components/playlist/playlist-watch-shared";

type PlaylistWatchScreenProps = {
  locale: Locale;
  organizationSlug: string;
  playlistId: string;
  posts: Post[];
  initialEpisodeId?: number | null;
};

export function PlaylistWatchScreen({
  locale,
  organizationSlug,
  playlistId,
  posts,
  initialEpisodeId = null,
}: PlaylistWatchScreenProps) {
  const router = useRouter();
  const detailsPath = useMemo(
    () => `/${locale}/playlists/${organizationSlug}/${playlistId}`,
    [locale, organizationSlug, playlistId]
  );
  const queue = useMemo(() => buildQueue(posts), [posts]);
  const seasonGroups = useMemo<SeasonGroup[]>(() => buildSeasonGroups(posts, queue), [posts, queue]);
  const initialIndex = useMemo(() => {
    if (!initialEpisodeId) {
      return 0;
    }

    const foundIndex = queue.findIndex((item) => item.id === initialEpisodeId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [initialEpisodeId, queue]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [videoCurrentSeconds, setVideoCurrentSeconds] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({});

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  const preloadNodesRef = useRef<Array<HTMLMediaElement>>([]);
  const ignoreRestoreOnceRef = useRef(false);
  const lastSavedSecondRef = useRef(0);

  const currentItem = queue[currentIndex] ?? null;
  const hasNext = currentIndex < queue.length - 1;
  const nextItem = hasNext ? queue[currentIndex + 1] : null;
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    router.prefetch(detailsPath);
  }, [detailsPath, router]);

  useEffect(() => {
    if (!isPickerOpen) {
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

      setIsPickerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isPickerOpen]);

  useEffect(() => {
    const preloadNodes = preloadNodesRef.current;
    const preloadedUrls = preloadedUrlsRef.current;

    return () => {
      for (const media of preloadNodes) {
        media.removeAttribute("src");
        media.load();
        media.remove();
      }

      preloadNodes.length = 0;
      preloadedUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    const media = mediaRef.current;
    if (!media) {
      return;
    }

    const playMedia = () => {
      void tryPlayMedia(media);
    };

    if (media.readyState >= 2) {
      playMedia();
      return;
    }

    media.addEventListener("loadeddata", playMedia, { once: true });

    return () => {
      media.removeEventListener("loadeddata", playMedia);
    };
  }, [currentIndex, currentItem]);

  function saveCurrentProgress() {
    if (!currentItem) {
      return;
    }

    const media = mediaRef.current;
    if (!media) {
      return;
    }

    const duration = Number.isFinite(media.duration) ? media.duration : 0;
    const currentTime = Number.isFinite(media.currentTime) ? media.currentTime : 0;

    if (duration <= 0 || currentTime <= 0) {
      return;
    }

    const percent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    writeProgress(currentItem.id, percent);
  }

  function preloadItem(item: QueueItem | null) {
    if (!item || typeof document === "undefined") {
      return;
    }

    if (preloadedUrlsRef.current.has(item.mediaUrl)) {
      return;
    }

    const media = document.createElement(item.mediaType === "video" ? "video" : "audio");
    media.preload = "auto";
    media.src = item.mediaUrl;
    media.muted = true;
    media.style.display = "none";

    if (item.mediaType === "video") {
      (media as HTMLVideoElement).playsInline = true;
    }

    document.body.appendChild(media);
    media.load();

    preloadNodesRef.current.push(media);
    preloadedUrlsRef.current.add(item.mediaUrl);
  }

  function toggleSeason(seasonNumber: number) {
    setExpandedSeasons((current) => ({
      ...current,
      [seasonNumber]: !current[seasonNumber],
    }));
  }

  function playEpisodeByIndex(index: number) {
    saveCurrentProgress();
    setCurrentIndex(Math.min(Math.max(0, index), queue.length - 1));
    setIsPickerOpen(false);
    setShowNextPrompt(false);
    setVideoProgressPercent(0);
    setVideoDurationSeconds(0);
    setVideoCurrentSeconds(0);
    setIsMediaLoading(true);
  }

  function goToNext() {
    if (!hasNext) {
      return;
    }

    saveCurrentProgress();
    ignoreRestoreOnceRef.current = true;
    setCurrentIndex((current) => Math.min(current + 1, queue.length - 1));
    setShowNextPrompt(false);
    setVideoProgressPercent(0);
    setVideoDurationSeconds(0);
    setVideoCurrentSeconds(0);
    setIsMediaLoading(true);
  }

  function handleTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) {
    const media = event.currentTarget;
    const duration = Number.isFinite(media.duration) ? media.duration : 0;
    const currentTime = Number.isFinite(media.currentTime) ? media.currentTime : 0;
    const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    setVideoDurationSeconds(duration);
    setVideoCurrentSeconds(currentTime);
    setVideoProgressPercent(progress);

    const floorCurrent = Math.floor(currentTime);
    if (floorCurrent >= lastSavedSecondRef.current + 5) {
      lastSavedSecondRef.current = floorCurrent;
      saveCurrentProgress();
    }

    if (!hasNext) {
      return;
    }

    const remaining = duration - currentTime;
    if (remaining <= PRELOAD_NEXT_EPISODE_THRESHOLD_SECONDS) {
      preloadItem(nextItem);
    }

    setShowNextPrompt(duration > 0 && remaining <= NEXT_EPISODE_THRESHOLD_SECONDS);
  }

  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) {
    const media = event.currentTarget;
    const duration = Number.isFinite(media.duration) ? media.duration : 0;

    setVideoDurationSeconds(duration);
    setVideoCurrentSeconds(0);
    setVideoProgressPercent(0);
    setIsMediaLoading(false);

    if (!currentItem || duration <= 0) {
      return;
    }

    if (ignoreRestoreOnceRef.current) {
      ignoreRestoreOnceRef.current = false;
      return;
    }

    const savedPercent = readProgress(currentItem.id);
    if (savedPercent <= 0 || savedPercent >= 99) {
      return;
    }

    const savedTime = (savedPercent / 100) * duration;
    media.currentTime = savedTime;
    setVideoCurrentSeconds(savedTime);
    setVideoProgressPercent(savedPercent);
    void tryPlayMedia(media);
  }

  function handleMediaReady(event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) {
    const media = event.currentTarget;
    if (media.readyState >= 2) {
      setIsMediaLoading(false);
    }
  }

  function handleMediaWaiting(event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) {
    const media = event.currentTarget;
    const isInitialLoad = media.currentTime <= 0.25;
    if (isInitialLoad && media.readyState < 2) {
      setIsMediaLoading(true);
    }
  }

  function handleEnded() {
    if (hasNext) {
      setShowNextPrompt(true);
    }
  }

  function toggleVideoPlayPause() {
    const media = mediaRef.current;
    if (!(media instanceof HTMLVideoElement)) {
      return;
    }

    if (media.paused) {
      const attempt = media.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(() => undefined);
      }
      return;
    }

    media.pause();
  }

  function toggleVideoMute() {
    const media = mediaRef.current;
    if (!(media instanceof HTMLVideoElement)) {
      return;
    }

    media.muted = !media.muted;
    setIsVideoMuted(media.muted);
  }

  function seekVideo(event: ChangeEvent<HTMLInputElement>) {
    const media = mediaRef.current;
    if (!(media instanceof HTMLVideoElement)) {
      return;
    }

    const duration = Number.isFinite(media.duration) ? media.duration : 0;
    if (duration <= 0) {
      return;
    }

    const percent = Number(event.target.value);
    const nextTime = (Math.min(100, Math.max(0, percent)) / 100) * duration;
    media.currentTime = nextTime;
    setVideoCurrentSeconds(nextTime);
    setVideoProgressPercent(percent);
  }

  function closeWatchScreen() {
    if (isClosing) {
      return;
    }

    saveCurrentProgress();
    setIsPickerOpen(false);
    setIsClosing(true);

    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }

    router.replace(detailsPath);
  }

  if (!portalTarget) {
    return null;
  }

  if (isClosing) {
    return null;
  }

  if (queue.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black text-white">
        <div className="space-y-3 text-center">
          <p className="text-sm text-white/80">Nenhum episódio com mídia reproduzível disponível.</p>
          <button
            type="button"
            onClick={closeWatchScreen}
            className="inline-flex h-10 cursor-pointer items-center rounded-[8px] border border-white/25 px-4 text-sm font-semibold text-white"
          >
            Voltar para a playlist
          </button>
        </div>
      </div>,
      portalTarget
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] bg-black">
      {currentItem ? (
        <>
          <div className="absolute left-4 top-4 right-28 z-[6] text-white sm:left-6 sm:top-6 sm:right-32">
            <p className="line-clamp-1 text-sm font-semibold sm:text-base">{currentItem.title}</p>
            <p className="text-xs text-white/70">
              Temporada {currentItem.seasonNumber} • Episódio {currentIndex + 1} de {queue.length}
            </p>
          </div>

          <div ref={pickerRef} className="absolute right-4 top-4 z-[7] sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={closeWatchScreen}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/60"
              aria-label="Fechar player"
            >
              <X size={18} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPickerOpen((current) => {
                  const next = !current;
                  if (next && seasonGroups.length > 0 && Object.keys(expandedSeasons).length === 0) {
                    setExpandedSeasons({ [seasonGroups[0].seasonNumber]: true });
                  }
                  return next;
                });
              }}
              className="ml-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 text-sm font-semibold text-white transition hover:bg-black/65"
              aria-label="Abrir episódios"
            >
              <Clapperboard size={16} />
              <span>Episódios</span>
            </button>

            {isPickerOpen ? (
              <div className="absolute right-0 top-12 w-[min(92vw,780px)] rounded-[12px] border border-white/20 bg-black/75 p-2 text-white backdrop-blur-sm">
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {seasonGroups.map((group) => {
                    const isExpanded = expandedSeasons[group.seasonNumber] ?? group.seasonNumber === seasonGroups[0]?.seasonNumber;

                    return (
                      <div key={group.seasonNumber} className="rounded-[10px] border border-white/20 bg-black/30">
                        <button
                          type="button"
                          onClick={() => toggleSeason(group.seasonNumber)}
                          className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
                        >
                          <span className="text-sm font-semibold text-white">
                            Temporada {group.seasonNumber}
                            {group.seasonTitle ? ` • ${group.seasonTitle}` : ""}
                          </span>
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>

                        {isExpanded ? (
                          <div className="space-y-1 border-t border-white/20 p-1">
                            {group.items.map((item) => {
                              const episodeIndex = queue.findIndex((entry) => entry.id === item.id);
                              const isActive = episodeIndex === currentIndex;

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => playEpisodeByIndex(Math.max(0, episodeIndex))}
                                  className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition ${
                                    isActive ? "bg-white/20 text-white" : "hover:bg-white/10"
                                  }`}
                                >
                                  <span className="line-clamp-1">{item.title}</span>
                                  {isActive ? <span className="text-[11px] text-white/75">Tocando</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative h-full w-full">
            {currentItem.mediaType === "video" ? (
              <>
                <video
                  key={`${currentItem.id}-${currentItem.mediaUrl}`}
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={currentItem.mediaUrl}
                  controls={false}
                  autoPlay
                  playsInline
                  muted={isVideoMuted}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onLoadedData={handleMediaReady}
                  onCanPlay={handleMediaReady}
                  onCanPlayThrough={handleMediaReady}
                  onProgress={handleMediaReady}
                  onWaiting={handleMediaWaiting}
                  onPlaying={() => setIsMediaLoading(false)}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-4 pt-16 sm:px-6">
                  <div className="pointer-events-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleVideoPlayPause}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/45 text-white transition hover:bg-black/65"
                      aria-label={isVideoPlaying ? "Pausar" : "Reproduzir"}
                    >
                      {isVideoPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleVideoMute}
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/45 text-white transition hover:bg-black/65"
                      aria-label={isVideoMuted ? "Ativar som" : "Silenciar"}
                    >
                      {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    <span className="shrink-0 text-xs text-white/85">
                      {formatDuration(videoCurrentSeconds)} / {formatDuration(videoDurationSeconds)}
                    </span>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={videoProgressPercent}
                      onChange={seekVideo}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
                      aria-label="Progresso do vídeo"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black">
                <audio
                  key={`${currentItem.id}-${currentItem.mediaUrl}`}
                  ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={currentItem.mediaUrl}
                  controls
                  autoPlay
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  onLoadedData={handleMediaReady}
                  onCanPlay={handleMediaReady}
                  onCanPlayThrough={handleMediaReady}
                  onProgress={handleMediaReady}
                  onWaiting={handleMediaWaiting}
                  onPlaying={() => setIsMediaLoading(false)}
                  className="w-full max-w-2xl"
                />
              </div>
            )}

            {isMediaLoading ? (
              <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-sm font-semibold text-white">
                  <Loader2 size={16} className="animate-spin" />
                  Carregando vídeo...
                </div>
              </div>
            ) : null}

            {showNextPrompt && hasNext ? (
              <button
                type="button"
                onClick={goToNext}
                className="absolute bottom-20 right-6 z-[4] inline-flex h-12 cursor-pointer items-center gap-2 rounded-[10px] border border-white/25 bg-black/75 px-4 text-sm font-semibold text-white transition hover:bg-black/90 sm:bottom-24"
              >
                <SkipForward size={15} />
                Ir para o próximo
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>,
    portalTarget
  );
}
