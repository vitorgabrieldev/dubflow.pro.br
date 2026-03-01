import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PlaylistsStream } from "@/components/playlist/playlists-stream";
import { fetchPlaylistsPage } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type PlaylistsSearch = {
  q?: string;
  user?: string;
  organization?: string;
  sort?: "recent" | "popular" | "title";
};

export default async function PlaylistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PlaylistsSearch>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const user = query.user?.trim() ?? "";
  const organization = query.organization?.trim() ?? "";
  const sort = query.sort ?? "recent";

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  const payload = await fetchPlaylistsPage({
    token,
    page: 1,
    perPage: 12,
    q,
    user,
    organization,
    sort,
    visibility: "public",
  }).catch(() => ({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  }));

  return (
    <section className="space-y-4">
      <PlaylistsStream
        key={`${locale}:${q}:${sort}:${user}:${organization}`}
        locale={locale}
        initialItems={payload.data ?? []}
        initialPage={payload.current_page ?? 1}
        initialLastPage={payload.last_page ?? 1}
        query={{ q, sort, user, organization }}
      />
    </section>
  );
}
