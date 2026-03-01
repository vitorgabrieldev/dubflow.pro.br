import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Film, Layers3, ListVideo, Search, Users, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";
import type { Organization, Playlist, UserPreview } from "@/types/api";

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    tab?: SearchTab;
  }>;
};

type SearchTab = "all" | "users" | "playlists" | "organizations" | "episodes" | "seasons";

type SearchPayload = {
  organizations?: Organization[];
  users?: UserPreview[];
  playlists?: (Playlist & { organization?: { slug?: string | null; name?: string | null } })[];
  episodes?: SearchEpisodeResult[];
  seasons?: SeasonHit[];
  counts?: {
    users?: number;
    playlists?: number;
    organizations?: number;
    episodes?: number;
    seasons?: number;
  };
};

type SeasonHit = {
  id: number;
  season_number: number;
  title: string | null;
  playlist: {
    id: number;
    title: string;
    slug: string | null;
  };
  organization: {
    id: number;
    name: string;
    slug: string | null;
  };
};

type SearchEpisodeResult = {
  id: number;
  title: string;
  media_type: "audio" | "video" | "image";
  thumbnail_path: string | null;
  preview_image_path: string | null;
  preview_video_path: string | null;
  organization: {
    id: number;
    name: string;
    slug: string | null;
  };
};

const TAB_ORDER: Array<{ key: SearchTab; label: string; icon: ReactNode }> = [
  { key: "all", label: "Tudo", icon: <Search size={15} /> },
  { key: "users", label: "Usuários", icon: <UserRound size={15} /> },
  { key: "playlists", label: "Playlists", icon: <ListVideo size={15} /> },
  { key: "organizations", label: "Comunidades", icon: <Users size={15} /> },
  { key: "episodes", label: "Episódios", icon: <Film size={15} /> },
  { key: "seasons", label: "Temporadas", icon: <Layers3 size={15} /> },
];

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const search = await searchParams;
  const query = search.q?.trim() ?? "";
  const activeTab = TAB_ORDER.some((tab) => tab.key === search.tab) ? (search.tab as SearchTab) : "all";

  if (query.length < 2) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-6 shadow-sm">
          <p className="text-sm text-black/70">Digite pelo menos 2 caracteres para buscar.</p>
        </section>
      </main>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const searchResponse = await fetch(`${apiBase}/search/unified?q=${encodeURIComponent(query)}&limit=24`, {
    headers,
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  }).catch(() => null);

  const searchPayload = searchResponse && searchResponse.ok ? ((await searchResponse.json()) as SearchPayload) : {};

  const users = searchPayload.users ?? [];
  const playlists = searchPayload.playlists ?? [];
  const organizations = searchPayload.organizations ?? [];
  const episodes = searchPayload.episodes ?? [];
  const seasons = searchPayload.seasons ?? [];

  const returnedCounts = searchPayload.counts ?? {};
  const usersCount = returnedCounts.users ?? users.length;
  const playlistsCount = returnedCounts.playlists ?? playlists.length;
  const organizationsCount = returnedCounts.organizations ?? organizations.length;
  const episodesCount = returnedCounts.episodes ?? episodes.length;
  const seasonsCount = returnedCounts.seasons ?? seasons.length;

  const counts: Record<SearchTab, number> = {
    all: usersCount + playlistsCount + organizationsCount + episodesCount + seasonsCount,
    users: usersCount,
    playlists: playlistsCount,
    organizations: organizationsCount,
    episodes: episodesCount,
    seasons: seasonsCount,
  };

  const allSections = [
    { key: "users" as const, count: usersCount, label: "Usuários", content: <UsersList locale={locale} users={users} /> },
    {
      key: "playlists" as const,
      count: playlistsCount,
      label: "Playlists",
      content: <PlaylistsList locale={locale} playlists={playlists} />,
    },
    {
      key: "organizations" as const,
      count: organizationsCount,
      label: "Comunidades",
      content: <OrganizationsList locale={locale} organizations={organizations} />,
    },
    {
      key: "episodes" as const,
      count: episodesCount,
      label: "Episódios",
      content: <EpisodesList locale={locale} episodes={episodes} />,
    },
    {
      key: "seasons" as const,
      count: seasonsCount,
      label: "Temporadas",
      content: <SeasonsList locale={locale} seasons={seasons} />,
    },
  ]
    .filter((section) => section.count > 0)
    .sort((a, b) => {
      if (a.count !== b.count) {
        return a.count - b.count;
      }
      const aIndex = TAB_ORDER.findIndex((tab) => tab.key === a.key);
      const bIndex = TAB_ORDER.findIndex((tab) => tab.key === b.key);
      return aIndex - bIndex;
    });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-5 shadow-sm">
        <p className="text-sm text-black/65">
          Resultado para: <strong>{query}</strong>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {TAB_ORDER.map((tab) => {
            const href = `/${locale}/buscar?q=${encodeURIComponent(query)}&tab=${tab.key}`;
            const isActive = activeTab === tab.key;

            return (
              <Link
                key={tab.key}
                href={href}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold ring-1 transition ${
                  isActive
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-[var(--color-border-soft)]"
                    : "bg-white text-black/75 ring-[var(--color-border-soft)] hover:bg-black/5"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">{counts[tab.key]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {activeTab === "all" ? (
        allSections.length > 0 ? (
          <div className="space-y-4">
            {allSections.map((section) => (
              <section key={section.key} className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
                <header className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">{section.label}</h2>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-black/65">{section.count}</span>
                </header>
                {section.content}
              </section>
            ))}
          </div>
        ) : (
          <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
            <p className="text-sm text-black/60">Nenhum resultado encontrado.</p>
          </section>
        )
      ) : null}

      {activeTab === "users" ? <SingleSection title="Usuários" count={usersCount}><UsersList locale={locale} users={users} /></SingleSection> : null}
      {activeTab === "playlists" ? <SingleSection title="Playlists" count={playlistsCount}><PlaylistsList locale={locale} playlists={playlists} /></SingleSection> : null}
      {activeTab === "organizations" ? <SingleSection title="Comunidades" count={organizationsCount}><OrganizationsList locale={locale} organizations={organizations} /></SingleSection> : null}
      {activeTab === "episodes" ? <SingleSection title="Episódios" count={episodesCount}><EpisodesList locale={locale} episodes={episodes} /></SingleSection> : null}
      {activeTab === "seasons" ? <SingleSection title="Temporadas" count={seasonsCount}><SeasonsList locale={locale} seasons={seasons} /></SingleSection> : null}
    </main>
  );
}

function SingleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-black/65">{count}</span>
      </header>
      {children}
    </section>
  );
}

function UsersList({ locale, users }: { locale: Locale; users: UserPreview[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-black/60">Sem resultados.</p>;
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/${locale}/perfil/${user.id}`}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border-soft)] px-3 py-2 hover:bg-black/5"
        >
          <span className="inline-flex items-center gap-2">
            <Avatar src={resolveMediaUrl(user.avatar_path)} name={user.stage_name || user.name} size="sm" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">{user.stage_name || user.name}</p>
          </span>
          <p className="text-xs text-black/60">{user.username ? `@${user.username}` : "Sem usuário"}</p>
        </Link>
      ))}
    </div>
  );
}

function PlaylistsList({
  locale,
  playlists,
}: {
  locale: Locale;
  playlists: (Playlist & { organization?: { slug?: string | null; name?: string | null } })[];
}) {
  if (playlists.length === 0) {
    return <p className="text-sm text-black/60">Sem resultados.</p>;
  }

  return (
    <div className="space-y-2">
      {playlists.map((playlist) => {
        const organizationSlug = playlist.organization?.slug ?? null;
        const href = organizationSlug ? `/${locale}/playlists/${organizationSlug}/${playlist.id}` : "#";

        return (
          <Link
            key={playlist.id}
            href={href}
            className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-soft)] px-3 py-2 hover:bg-black/5"
          >
            <p className="text-sm font-semibold text-[var(--color-ink)]">{playlist.title}</p>
            <p className="text-xs text-black/60">{playlist.organization?.name ?? "Comunidade"}</p>
          </Link>
        );
      })}
    </div>
  );
}

function OrganizationsList({
  locale,
  organizations,
}: {
  locale: Locale;
  organizations: Organization[];
}) {
  if (organizations.length === 0) {
    return <p className="text-sm text-black/60">Sem resultados.</p>;
  }

  return (
    <div className="space-y-2">
      {organizations.map((organization) => (
        <Link
          key={organization.id}
          href={`/${locale}/organizations/${organization.slug}`}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border-soft)] px-3 py-2 hover:bg-black/5"
        >
          <span className="inline-flex items-center gap-2">
            <Avatar src={resolveMediaUrl(organization.avatar_path)} name={organization.name} size="sm" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">{organization.name}</p>
          </span>
          <p className="text-xs text-black/60">{organization.slug}</p>
        </Link>
      ))}
    </div>
  );
}

function EpisodesList({ locale, episodes }: { locale: Locale; episodes: SearchEpisodeResult[] }) {
  if (episodes.length === 0) {
    return <p className="text-sm text-black/60">Sem resultados.</p>;
  }

  return (
    <div className="space-y-2">
      {episodes.map((post) => (
        <Link
          key={post.id}
          href={`/${locale}/post/${post.id}`}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border-soft)] px-3 py-2 hover:bg-black/5"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <EpisodePreview episode={post} />
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{post.title}</p>
          </span>
          <p className="shrink-0 text-xs text-black/60">{post.organization.name}</p>
        </Link>
      ))}
    </div>
  );
}

function EpisodePreview({ episode }: { episode: SearchEpisodeResult }) {
  const previewImage = resolveMediaUrl(episode.preview_image_path ?? episode.thumbnail_path);
  const previewVideo = episode.media_type === "video" ? resolveMediaUrl(episode.preview_video_path) : null;

  if (previewImage) {
    return (
      <span className="relative inline-flex h-9 w-16 overflow-hidden rounded-[8px] border border-black/10 bg-black/5">
        <Image src={previewImage} alt={episode.title} fill sizes="64px" className="object-cover" />
      </span>
    );
  }

  if (previewVideo) {
    return (
      <span className="relative inline-flex h-9 w-16 overflow-hidden rounded-[8px] border border-black/10 bg-black/10">
        <video
          src={previewVideo}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex h-9 w-16 items-center justify-center rounded-[8px] border border-black/10 bg-black/5 text-black/55">
      <Film size={14} />
    </span>
  );
}

function SeasonsList({ locale, seasons }: { locale: Locale; seasons: SeasonHit[] }) {
  if (seasons.length === 0) {
    return <p className="text-sm text-black/60">Sem resultados.</p>;
  }

  return (
    <div className="space-y-2">
      {seasons.map((season) => {
        const href = season.organization.slug
          ? `/${locale}/playlists/${season.organization.slug}/${season.playlist.id}?season=${season.id}`
          : "#";

        return (
          <Link
            key={`${season.playlist.id}:${season.id}`}
            href={href}
            className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-soft)] px-3 py-2 hover:bg-black/5"
          >
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              T{season.season_number}
              {season.title ? ` • ${season.title}` : ""}
            </p>
            <p className="text-xs text-black/60">{season.playlist.title}</p>
          </Link>
        );
      })}
    </div>
  );
}
