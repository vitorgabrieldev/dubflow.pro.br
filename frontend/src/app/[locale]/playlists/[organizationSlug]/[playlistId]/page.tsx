import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays, Film, Layers2 } from "lucide-react";

import { PostCard } from "@/components/feed/post-card";
import { PlaylistWatchPlayer } from "@/components/playlist/playlist-watch-player";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import type { ApiList, Playlist, PlaylistSeason, Post } from "@/types/api";

type PlaylistShowResponse = {
  playlist: Playlist & { seasons_count?: number };
  seasons?: PlaylistSeason[];
  posts: ApiList<Post>;
};

type PlaylistSearch = {
  season?: string;
};

export default async function PlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; organizationSlug: string; playlistId: string }>;
  searchParams: Promise<PlaylistSearch>;
}) {
  const { locale, organizationSlug, playlistId } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const isAuthenticated = Boolean(token);

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const seasonId = query.season?.trim() ?? "";
  const search = seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : "";

  const response = await fetch(`${apiBase}/organizations/${organizationSlug}/playlists/${playlistId}${search}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });

  if (response.status === 404 || response.status === 403) {
    notFound();
  }

  if (!response.ok) {
    return <EmptyState />;
  }

  const payload = (await response.json()) as PlaylistShowResponse;
  const playlist = payload.playlist;
  const posts = payload.posts?.data ?? [];
  const seasons = payload.seasons ?? [];
  const watchQueuePosts = await fetchAllPlaylistPosts(apiBase, organizationSlug, playlistId, token);
  const playlistUrl = `${getSiteUrl()}/${locale}/playlists/${organizationSlug}/${playlistId}`;
  const playlistSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: playlist.title,
    description: playlist.description ?? undefined,
    url: playlistUrl,
    numberOfItems: playlist.posts_count ?? posts.length,
    about: playlist.work_title
      ? {
          "@type": "CreativeWork",
          name: playlist.work_title,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "DubFlow",
      url: getSiteUrl(),
    },
  };

  return (
    <section className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(playlistSchema),
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Playlists", href: `/${locale}/playlists` },
          { label: playlist.title },
        ]}
      />

      <Card className="relative z-[30]">
        <CardBody className="space-y-3 p-4">
          <p className="line-clamp-2 text-xl font-semibold text-[var(--color-ink)]">{playlist.title}</p>
          <p className="text-sm text-black/65">{playlist.description ?? "Sem descrição."}</p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-black/70">
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <Film size={13} />
              {playlist.work_title ?? "Obra não informada"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <Layers2 size={13} />
              {playlist.seasons_count ?? seasons.length} temporadas
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <CalendarDays size={13} />
              Criada em {formatCreatedAt(playlist.created_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              {playlist.posts_count ?? posts.length} episódios
            </span>
          </div>

          <PlaylistWatchPlayer
            locale={locale as Locale}
            organizationSlug={organizationSlug}
            playlistId={playlistId}
            posts={watchQueuePosts}
          />

          {seasons.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
              <Link
                href={`/${locale}/playlists/${organizationSlug}/${playlistId}`}
                className={`inline-flex h-9 items-center rounded-[8px] px-3 text-xs font-semibold ${
                  !seasonId ? "bg-[var(--color-primary)] text-white" : "bg-black/5 text-black/70"
                }`}
              >
                Todas as temporadas
              </Link>
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/${locale}/playlists/${organizationSlug}/${playlistId}?season=${season.id}`}
                  className={`inline-flex h-9 items-center rounded-[8px] px-3 text-xs font-semibold ${
                    seasonId === String(season.id) ? "bg-[var(--color-primary)] text-white" : "bg-black/5 text-black/70"
                  }`}
                >
                  T{season.season_number} • {season.episodes_count ?? 0} episódios
                </Link>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              locale={locale as Locale}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </section>
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
