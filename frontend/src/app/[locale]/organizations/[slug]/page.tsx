import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Film, Layers3, Mic2, PencilLine, UserPlus } from "lucide-react";

import { FollowOrganizationButton } from "@/components/community/follow-organization-button";
import { PostCard } from "@/components/feed/post-card";
import { OrganizationDubbingTestsList } from "@/components/opportunity/organization-dubbing-tests-list";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import type { DubbingTest, Playlist, Post } from "@/types/api";

type OrganizationResponse = {
  organization: {
    id: number;
    name: string;
    slug: string;
    is_public: boolean;
    description: string | null;
    avatar_path: string | null;
    cover_path?: string | null;
    followers_count: number;
    posts_count: number;
    playlists_count: number;
    playlists?: (Playlist & { seasons_count?: number })[];
    posts?: Post[];
  };
  viewer?: {
    is_following: boolean;
    membership_status: "active" | "pending" | null;
    role: "owner" | "admin" | "editor" | "member" | null;
    can_request_join: boolean;
  };
};

type DubbingTestsPayload = {
  data?: DubbingTest[];
  current_page?: number;
  last_page?: number;
};

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

  const response = await fetch(`${apiBase}/organizations/${slug}`, {
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

  const payload = (await response.json()) as OrganizationResponse;
  const organization = payload.organization;
  const viewer = payload.viewer;
  const viewerRole = viewer?.role ?? null;
  const isViewerMember = viewer?.membership_status === "active";
  const canJoinPublic = organization.is_public && !isViewerMember && (viewer ? viewer.can_request_join : true);
  const isOwner = viewerRole === "owner";
  const canInviteMembers = viewerRole === "owner" || viewerRole === "admin";
  const posts = organization.posts ?? [];
  const playlists = organization.playlists ?? [];
  const coverImage = resolveMediaUrl(organization.cover_path) ?? "/default-org-banner.svg";
  const avatarImage = resolveMediaUrl(organization.avatar_path) ?? "/default-org-avatar.svg";
  const dubbingTestsResponse = await fetch(`${apiBase}/organizations/${slug}/dubbing-tests?per_page=3`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });
  const dubbingTestsPayload = dubbingTestsResponse.ok
    ? ((await dubbingTestsResponse.json()) as DubbingTestsPayload)
    : ({ data: [], current_page: 1, last_page: 1 } as DubbingTestsPayload);
  const canManageTests = viewerRole === "owner" || viewerRole === "admin";
  const organizationUrl = `${getSiteUrl()}/${locale}/organizations/${organization.slug}`;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url: organizationUrl,
    description: organization.description ?? undefined,
    logo: avatarImage,
    image: coverImage,
    memberOf: {
      "@type": "WebSite",
      name: "DubFlow",
      url: getSiteUrl(),
    },
  };

  return (
    <section className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name },
        ]}
      />

      <Card>
        <div className="relative h-32 w-full overflow-hidden sm:h-40 md:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={`Capa da comunidade ${organization.name}`}
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(12,6,24,0.2),rgba(12,6,24,0.55))]" />
        </div>
        <CardBody className="space-y-4 p-4">
          <div className="-mt-10 flex flex-col gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Avatar
                src={avatarImage}
                name={organization.name}
                size="lg"
                className="h-20 w-20 rounded-[10px] border-2 border-white bg-white shadow-lg sm:h-24 sm:w-24"
              />
              <div className="min-w-0">
                <p className="line-clamp-3 break-words text-xl font-semibold leading-tight text-[var(--color-ink)] sm:text-2xl">
                  {organization.name}
                </p>
                <p className="line-clamp-1 break-all text-xs text-black/55">@{organization.slug}</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-1.5 text-xs text-black/70 sm:w-auto">
              <span className="rounded-[8px] bg-black/5 px-3 py-2">
                <strong className="text-[var(--color-ink)]">{organization.followers_count}</strong> seguidores
              </span>
              <span className="rounded-[8px] bg-black/5 px-3 py-2">
                <strong className="text-[var(--color-ink)]">{organization.posts_count}</strong> episódios
              </span>
              <span className="rounded-[8px] bg-black/5 px-3 py-2">
                <strong className="text-[var(--color-ink)]">{organization.playlists_count}</strong> playlists
              </span>
            </div>
          </div>

          <p className="text-sm text-black/65">{organization.description ?? "Sem descrição."}</p>

          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <>
                <Link
                  href={`/${locale}/organizations/${organization.slug}/editar`}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                >
                  <PencilLine size={14} />
                  Editar comunidade
                </Link>
                <Link
                  href={`/${locale}/organizations/${organization.slug}/convidar`}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                >
                  <UserPlus size={14} />
                  Convidar
                </Link>
                <Link
                  href={`/${locale}/organizations/${organization.slug}/oportunidades/novo`}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                >
                  <Mic2 size={14} />
                  Novo teste
                </Link>
              </>
            ) : canInviteMembers ? (
              <>
                <Link
                  href={`/${locale}/organizations/${organization.slug}/convidar`}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                >
                  <UserPlus size={14} />
                  Convidar
                </Link>
                <Link
                  href={`/${locale}/organizations/${organization.slug}/oportunidades/novo`}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                >
                  <Mic2 size={14} />
                  Novo teste
                </Link>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <FollowOrganizationButton
                  slug={organization.slug}
                  isAuthenticated={Boolean(token)}
                  initialFollowing={viewer?.is_following ?? false}
                  initialFollowersCount={organization.followers_count}
                  showFollowersCount
                />
                {isViewerMember ? (
                  <span className="inline-flex h-10 items-center rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                    Você faz parte da comunidade
                  </span>
                ) : null}
                {canJoinPublic ? (
                  <form action={`/api/organizations/${organization.slug}/join-request`} method="post">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="redirect_to" value={`/${locale}/organizations/${organization.slug}`} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
                    >
                      Entrar na comunidade
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Layers3 size={14} />
            Playlists da comunidade
          </p>

          {playlists.length === 0 ? (
            <EmptyState inline />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/${locale}/playlists/${organization.slug}/${playlist.id}`}
                  className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm text-black/75"
                >
                  <p className="line-clamp-1 font-semibold text-[var(--color-ink)]">{playlist.title}</p>
                  <p className="line-clamp-1 text-xs text-black/55">
                    {(playlist.posts_count ?? 0)} episódios • {(playlist.seasons_count ?? 0)} temporadas
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Mic2 size={14} />
            Testes de dublagem
          </p>

          <OrganizationDubbingTestsList
            locale={locale}
            organizationSlug={organization.slug}
            canManage={canManageTests}
            initialItems={dubbingTestsPayload.data ?? []}
            initialPage={dubbingTestsPayload.current_page ?? 1}
            initialLastPage={dubbingTestsPayload.last_page ?? 1}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Film size={14} />
            Todos os episódios
          </p>

          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  locale={locale as Locale}
                  isAuthenticated={Boolean(token)}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

    </section>
  );
}
