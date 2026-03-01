import { resolveMediaUrl } from "@/lib/api";
import type { Post } from "@/types/api";

export type QueueItem = {
  id: number;
  title: string;
  seasonNumber: number;
  mediaType: "video" | "audio";
  mediaUrl: string;
};

export type SeasonGroup = {
  seasonNumber: number;
  seasonTitle: string | null;
  items: QueueItem[];
};

export const NEXT_EPISODE_THRESHOLD_SECONDS = 90;
export const PRELOAD_NEXT_EPISODE_THRESHOLD_SECONDS = 180;
export const PROGRESS_STORAGE_KEY = "playlist_watch_progress_v1";

export function buildQueue(posts: Post[]): QueueItem[] {
  const deduped = new Map<number, QueueItem>();

  for (const post of posts) {
    const media = resolvePlayableMedia(post);
    if (!media) {
      continue;
    }

    deduped.set(post.id, {
      id: post.id,
      title: post.title,
      seasonNumber: post.season?.season_number ?? 1,
      mediaType: media.type,
      mediaUrl: media.url,
    });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) {
      return a.seasonNumber - b.seasonNumber;
    }

    return a.id - b.id;
  });
}

export function buildSeasonGroups(posts: Post[], queue: QueueItem[]): SeasonGroup[] {
  const episodeById = new Map<number, Post>();
  for (const post of posts) {
    episodeById.set(post.id, post);
  }

  const map = new Map<number, SeasonGroup>();

  for (const item of queue) {
    const episode = episodeById.get(item.id);
    const seasonNumber = item.seasonNumber > 0 ? item.seasonNumber : 1;
    const existing = map.get(seasonNumber);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    map.set(seasonNumber, {
      seasonNumber,
      seasonTitle: episode?.season?.title ?? null,
      items: [item],
    });
  }

  return [...map.values()].sort((a, b) => a.seasonNumber - b.seasonNumber);
}

export function resolveEpisodePreviewImage(post: Post | undefined): string | null {
  if (!post) {
    return null;
  }

  const thumbnail = resolveMediaUrl(post.thumbnail_path);
  if (thumbnail) {
    return thumbnail;
  }

  const metadataImage = post.metadata?.assets?.find((asset) => asset.type === "image");
  if (metadataImage?.path) {
    return resolveMediaUrl(metadataImage.path);
  }

  if (post.media_type === "image" && post.media_path) {
    return resolveMediaUrl(post.media_path);
  }

  return null;
}

export function resolveEpisodePreviewVideo(post: Post | undefined): string | null {
  if (!post) {
    return null;
  }

  const metadataVideo = post.metadata?.assets?.find((asset) => asset.type === "video");
  if (metadataVideo?.path) {
    return resolveMediaUrl(metadataVideo.path);
  }

  if (post.media_type === "video" && post.media_path) {
    return resolveMediaUrl(post.media_path);
  }

  return null;
}

export function formatDuration(valueInSeconds: number): string {
  if (!Number.isFinite(valueInSeconds) || valueInSeconds <= 0) {
    return "00:00";
  }

  const total = Math.floor(valueInSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function readProgress(postId: number): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    const value = parsed[String(postId)];
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, value));
  } catch {
    return 0;
  }
}

export function writeProgress(postId: number, percent: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[String(postId)] = Math.min(100, Math.max(0, percent));
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Falha de storage não deve quebrar o player.
  }
}

export async function tryPlayMedia(media: HTMLMediaElement): Promise<void> {
  try {
    const attempt = media.play();
    if (attempt && typeof attempt.catch === "function") {
      await attempt.catch(() => undefined);
    }
  } catch {
    // Autoplay pode falhar por política do navegador.
  }
}

function resolvePlayableMedia(post: Post): { type: "video" | "audio"; url: string } | null {
  const metadataAssets = post.metadata?.assets ?? [];

  for (const asset of metadataAssets) {
    if (asset.type !== "video") {
      continue;
    }

    const resolved = resolveMediaUrl(asset.path);
    if (resolved) {
      return { type: "video", url: resolved };
    }
  }

  for (const asset of metadataAssets) {
    if (asset.type !== "audio") {
      continue;
    }

    const resolved = resolveMediaUrl(asset.path);
    if (resolved) {
      return { type: "audio", url: resolved };
    }
  }

  if (post.media_path && (post.media_type === "video" || post.media_type === "audio")) {
    const resolved = resolveMediaUrl(post.media_path);
    if (resolved) {
      return { type: post.media_type, url: resolved };
    }
  }

  return null;
}
