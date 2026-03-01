import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PlaylistWatchScreen } from "@/components/playlist/playlist-watch-screen";
import { isLocale, type Locale } from "@/lib/i18n";
import type { ApiList, Playlist, PlaylistSeason, Post } from "@/types/api";

type PlaylistShowResponse = {
  playlist: Playlist & { seasons_count?: number };
  seasons?: PlaylistSeason[];
  posts: ApiList<Post>;
};

type WatchSearch = {
  episode?: string;
};

export default async function PlaylistWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; organizationSlug: string; playlistId: string }>;
  searchParams: Promise<WatchSearch>;
}) {
  const { locale, organizationSlug, playlistId } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

  const initialEpisodeIdValue = Number.parseInt(query.episode ?? "", 10);
  const initialEpisodeId = Number.isFinite(initialEpisodeIdValue) ? initialEpisodeIdValue : null;

  const watchQueuePosts = await fetchAllPlaylistPosts(apiBase, organizationSlug, playlistId, token);

  return (
    <PlaylistWatchScreen
      locale={locale as Locale}
      organizationSlug={organizationSlug}
      playlistId={playlistId}
      posts={watchQueuePosts}
      initialEpisodeId={initialEpisodeId}
    />
  );
}

async function fetchAllPlaylistPosts(
  apiBase: string,
  organizationSlug: string,
  playlistId: string,
  token?: string
): Promise<Post[]> {
  const requestPage = async (page: number): Promise<PlaylistShowResponse | null> => {
    const search = new URLSearchParams();
    if (page > 1) {
      search.set("page", String(page));
    }

    const query = search.toString();
    const url = `${apiBase}/organizations/${organizationSlug}/playlists/${playlistId}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PlaylistShowResponse;
  };

  const firstPage = await requestPage(1);
  if (!firstPage) {
    return [];
  }

  const allPosts = [...(firstPage.posts?.data ?? [])];
  const lastPage = Math.max(1, firstPage.posts?.last_page ?? 1);

  if (lastPage > 1) {
    const remainingPages = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, index) => requestPage(index + 2))
    );

    for (const pagePayload of remainingPages) {
      if (!pagePayload?.posts?.data) {
        continue;
      }

      allPosts.push(...pagePayload.posts.data);
    }
  }

  const dedupedById = new Map<number, Post>();
  for (const post of allPosts) {
    dedupedById.set(post.id, post);
  }

  return [...dedupedById.values()];
}
