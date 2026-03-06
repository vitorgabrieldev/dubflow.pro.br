import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers3 } from "lucide-react";

import { PlaylistCard } from "@/components/feed/playlist-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isLocale, type Locale } from "@/lib/i18n";
import type { ApiList, Playlist } from "@/types/api";

type OrganizationMetaResponse = {
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
};

export default async function OrganizationPlaylistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

  const [organizationResponse, playlistsResponse] = await Promise.all([
    fetch(`${apiBase}/organizations/${slug}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    }),
    fetch(`${apiBase}/organizations/${slug}/playlists?page=${page}&per_page=12`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    }),
  ]);

  if (
    organizationResponse.status === 404 ||
    organizationResponse.status === 403 ||
    playlistsResponse.status === 404 ||
    playlistsResponse.status === 403
  ) {
    notFound();
  }

  if (!organizationResponse.ok || !playlistsResponse.ok) {
    return <EmptyState />;
  }

  const organizationPayload = (await organizationResponse.json()) as OrganizationMetaResponse;
  const playlistsPayload = (await playlistsResponse.json()) as ApiList<Playlist>;
  const organization = organizationPayload.organization;

  if (!organization) {
    notFound();
  }

  const playlists = playlistsPayload.data ?? [];
  const currentPage = playlistsPayload.current_page ?? page;
  const lastPage = playlistsPayload.last_page ?? 1;

  const pageHref = (targetPage: number) =>
    `/${locale}/organizations/${organization.slug}/playlists?page=${targetPage}`;

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Playlists" },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                <Layers3 size={16} />
                Playlists da comunidade
              </p>
              <p className="text-sm text-black/60">{organization.name}</p>
            </div>

            <Link
              href={`/${locale}/organizations/${organization.slug}`}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
            >
              <ArrowLeft size={14} />
              Voltar à comunidade
            </Link>
          </div>

          {playlists.length === 0 ? (
            <EmptyState inline />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/${locale}/playlists/${organization.slug}/${playlist.id}`}
                  className="block h-full"
                >
                  <PlaylistCard playlist={playlist} locale={locale as Locale} />
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-black/10 bg-white px-3 py-2">
            <p className="text-xs text-black/60">
              Página {currentPage} de {lastPage}
            </p>

            <div className="flex items-center gap-2">
              <Link
                href={pageHref(Math.max(1, currentPage - 1))}
                className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-xs font-semibold ${
                  currentPage > 1
                    ? "cursor-pointer border-black/10 bg-white text-[var(--color-ink)]"
                    : "pointer-events-none border-black/10 bg-black/[0.04] text-black/35"
                }`}
              >
                Anterior
              </Link>

              <Link
                href={pageHref(Math.min(lastPage, currentPage + 1))}
                className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-xs font-semibold ${
                  currentPage < lastPage
                    ? "cursor-pointer border-black/10 bg-white text-[var(--color-ink)]"
                    : "pointer-events-none border-black/10 bg-black/[0.04] text-black/35"
                }`}
              >
                Próxima
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
