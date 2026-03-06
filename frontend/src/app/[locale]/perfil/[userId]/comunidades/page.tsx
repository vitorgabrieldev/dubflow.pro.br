import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type PublicCommunitiesResponse = {
  user?: {
    id: number;
    name: string;
    stage_name?: string | null;
  };
  communities?: CommunityItem[];
};

type CommunityItem = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  avatar_path?: string | null;
  is_verified?: boolean;
  followers_count?: number;
  posts_count?: number;
  playlists_count?: number;
};

export default async function UserCommunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, userId } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const requestToken = token;

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const response = await fetch(
    `${apiBase}/users/${parsedUserId}?per_page=1&organizations_limit=24`,
    {
      headers: {
        Accept: "application/json",
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      },
      ...(requestToken ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    }
  );

  if (response.status === 404 || response.status === 403) {
    notFound();
  }

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as PublicCommunitiesResponse;
  const user = payload.user;
  if (!user) {
    notFound();
  }

  const communities = payload.communities ?? [];
  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const perPage = 8;
  const total = communities.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageItems = communities.slice(startIndex, startIndex + perPage);

  const profileName = user.stage_name?.trim() || user.name;
  const backToProfileHref = `/${locale}/perfil/${user.id}`;

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    return `/${locale}/perfil/${user.id}/comunidades?${params.toString()}`;
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Building2 size={16} />
              Comunidades de {profileName}
            </p>
            <p className="text-xs text-black/60">{total} comunidades</p>
          </div>

          <Link
            href={backToProfileHref}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} />
            Voltar ao perfil
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          {pageItems.length === 0 ? (
            <p className="text-sm text-black/65">Este perfil ainda não possui comunidades visíveis.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((community) => (
                <article key={community.id} className="space-y-3 rounded-[10px] border border-black/10 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <Avatar src={resolveMediaUrl(community.avatar_path)} name={community.name} size="lg" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{community.name}</p>
                      <p className="line-clamp-1 text-xs text-black/55">@{community.slug}</p>
                      {community.is_verified ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-[6px] bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck size={11} />
                          Verificada
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center text-[11px] text-black/65">
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{community.followers_count ?? 0}</strong>
                      <br />
                      seguidores
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{community.playlists_count ?? 0}</strong>
                      <br />
                      playlists
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{community.posts_count ?? 0}</strong>
                      <br />
                      episódios
                    </span>
                  </div>

                  <Link
                    href={`/${locale}/organizations/${community.slug}`}
                    className="inline-flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    Abrir comunidade
                  </Link>
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-black/10 bg-white px-3 py-2">
            <p className="text-xs text-black/60">
              Página {currentPage} de {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <Link
                href={pageHref(Math.max(1, currentPage - 1))}
                className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-xs font-semibold ${
                  currentPage > 1
                    ? "border-black/10 bg-white text-[var(--color-ink)]"
                    : "pointer-events-none border-black/10 bg-black/[0.04] text-black/35"
                }`}
              >
                Anterior
              </Link>

              <Link
                href={pageHref(Math.min(totalPages, currentPage + 1))}
                className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-xs font-semibold ${
                  currentPage < totalPages
                    ? "border-black/10 bg-white text-[var(--color-ink)]"
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
