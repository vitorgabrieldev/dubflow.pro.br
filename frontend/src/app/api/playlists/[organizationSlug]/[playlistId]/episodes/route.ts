import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { ApiList, Playlist, PlaylistSeason, Post } from "@/types/api";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

type PlaylistShowResponse = {
  playlist?: Playlist & { seasons_count?: number };
  seasons?: PlaylistSeason[];
  posts?: ApiList<Post>;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationSlug: string; playlistId: string }> }
) {
  const { organizationSlug, playlistId } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  const fetchPage = async (page: number): Promise<PlaylistShowResponse | null> => {
    const search = new URLSearchParams({
      per_page: "100",
      page: String(page),
    });

    const response = await fetch(
      `${API_BASE_URL}/organizations/${organizationSlug}/playlists/${playlistId}?${search.toString()}`,
      {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PlaylistShowResponse;
  };

  const firstPage = await fetchPage(1);
  if (!firstPage?.playlist || !firstPage.posts) {
    return NextResponse.json(
      {
        message: "Não foi possível carregar os episódios da playlist.",
      },
      { status: 404 }
    );
  }

  const episodes = [...(firstPage.posts.data ?? [])];
  const lastPage = Math.max(1, firstPage.posts.last_page ?? 1);

  if (lastPage > 1) {
    const pages = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, index) => fetchPage(index + 2))
    );

    for (const payload of pages) {
      const pageData = payload?.posts?.data ?? [];
      episodes.push(...pageData);
    }
  }

  const deduped = new Map<number, Post>();
  for (const episode of episodes) {
    deduped.set(episode.id, episode);
  }

  return NextResponse.json({
    playlist: firstPage.playlist,
    seasons: firstPage.seasons ?? [],
    episodes: [...deduped.values()],
  });
}
