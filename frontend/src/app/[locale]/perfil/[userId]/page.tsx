import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Edit3,
  Eye,
  KeyRound,
  Languages,
  MapPin,
  MessageCircle,
  MessageSquareMore,
  Mic,
  MoreHorizontal,
  Plus,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import { PostCard } from "@/components/feed/post-card";
import { FollowUserButton } from "@/components/profile/follow-user-button";
import { MessageUserButton } from "@/components/profile/message-user-button";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchCurrentUser, resolveMediaUrl } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import type { ApiList, Post, UserPreview } from "@/types/api";

type PublicProfileResponse = {
  user: UserPreview & {
    bio?: string | null;
    website_url?: string | null;
    locale?: string | null;
    created_at?: string;
    cover_path?: string | null;
    pronouns?: string | null;
    skills?: string[];
    tags?: string[];
    dubbing_history?: string | null;
    dubbing_languages?: string[];
    voice_accents?: string[];
    has_recording_equipment?: boolean;
    recording_equipment?: string[];
    recording_equipment_other?: string | null;
    weekly_availability?: string[];
    state?: string | null;
    city?: string | null;
    proposal_contact_preferences?: string[];
    proposal_contact_links?: {
      email?: string | null;
      whatsapp?: string | null;
      discord?: string | null;
    };
  };
  summary: {
    posts: number;
    likes: number;
    views: number;
    organizations: number;
    followers?: number;
    following?: number;
  };
  viewer?: {
    can_follow?: boolean;
    is_following?: boolean;
    can_message?: boolean;
    message_reason?: string | null;
  };
  posts: ApiList<Post>;
  communities?: Array<{
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    avatar_path?: string | null;
    cover_path?: string | null;
    is_verified?: boolean;
    is_public?: boolean;
    followers_count?: number;
    posts_count?: number;
    playlists_count?: number;
  }>;
  achievements?: Array<{
    id: number;
    level?: number;
    definition?: {
      title?: string | null;
      rarity?: string | null;
      icon?: string | null;
      color_start?: string | null;
      color_end?: string | null;
    } | null;
    level_definition?: {
      title?: string | null;
      rarity?: string | null;
      icon?: string | null;
      color_start?: string | null;
      color_end?: string | null;
    } | null;
  }>;
};

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const CONTACT_LABELS: Record<string, string> = {
  dm_plataforma: "Mensagem na plataforma",
  email: "E-mail",
  whatsapp: "WhatsApp",
  discord: "Discord",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  microfone_condensador: "Microfone condensador",
  microfone_dinamico: "Microfone dinâmico",
  interface_audio: "Interface de áudio",
  tratamento_acustico: "Tratamento acústico",
  booth: "Booth/cabine",
};

function mapLabeledValues(values: string[] | undefined, labels: Record<string, string>) {
  return (values ?? []).map((value) => labels[value] ?? value).filter(Boolean);
}

function resolveProposalContactHref(type: string, value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (type === "email") {
    return `mailto:${normalized}`;
  }

  if (type === "whatsapp") {
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    const digits = normalized.replace(/\D+/g, "");
    if (!digits) {
      return null;
    }
    return `https://wa.me/${digits}`;
  }

  if (type === "discord") {
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    return null;
  }

  return null;
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ external_preview?: string; owner_view?: string }>;
}) {
  const { locale, userId } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const requestedExternalPreview = query.external_preview === "1";
  const requestedOwnerView = query.owner_view === "1";
  const hasPreviewFlags = requestedExternalPreview || requestedOwnerView;
  const parsedUserId = Number.parseInt(userId, 10);
  const currentUser = token ? await fetchCurrentUser(token) : null;
  const isProfileOwner = Boolean(currentUser && Number.isFinite(parsedUserId) && currentUser.id === parsedUserId);

  if (hasPreviewFlags && !isProfileOwner) {
    redirect(`/${locale}/perfil/${userId}`);
  }

  const isExternalPreview = requestedExternalPreview && isProfileOwner;
  const isOwnerView = requestedOwnerView && isProfileOwner;
  const requestToken = isExternalPreview ? undefined : token;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

  const response = await fetch(`${apiBase}/users/${userId}?per_page=20`, {
    headers: {
      Accept: "application/json",
      ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
    },
    ...(requestToken ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });

  if (response.status === 404 || response.status === 403) {
    notFound();
  }

  if (!response.ok) {
    return <EmptyState />;
  }

  const payload = (await response.json()) as PublicProfileResponse;
  const isOwnProfileView = Boolean(token) && !isExternalPreview && Boolean(isOwnerView) && payload.viewer?.can_follow === false;
  const name = payload.user.stage_name ?? payload.user.name;
  const posts = payload.posts.data ?? [];
  const communities = payload.communities ?? [];
  const achievements = payload.achievements ?? [];
  const visibleCommunities = communities.slice(0, 3);
  const visibleAchievements = achievements.slice(0, 3);
  const communityRouteParams = new URLSearchParams();
  if (isExternalPreview) {
    communityRouteParams.set("external_preview", "1");
  }
  if (isOwnProfileView || isOwnerView) {
    communityRouteParams.set("owner_view", "1");
  }
  const showMoreCommunitiesHref = communityRouteParams.toString()
    ? `/${locale}/perfil/${payload.user.id}/comunidades?${communityRouteParams.toString()}`
    : `/${locale}/perfil/${payload.user.id}/comunidades`;
  const achievementRouteParams = new URLSearchParams();
  if (isExternalPreview) {
    achievementRouteParams.set("external_preview", "1");
  }
  if (isOwnProfileView || isOwnerView) {
    achievementRouteParams.set("owner_view", "1");
  }
  const showMoreAchievementsHref = achievementRouteParams.toString()
    ? `/${locale}/perfil/${payload.user.id}/conquistas?${achievementRouteParams.toString()}`
    : `/${locale}/perfil/${payload.user.id}/conquistas`;
  const profileUrl = `${getSiteUrl()}/${locale}/perfil/${payload.user.id}`;
  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: profileUrl,
    description: payload.user.bio ?? undefined,
    image: resolveMediaUrl(payload.user.avatar_path) ?? undefined,
    sameAs: payload.user.website_url ? [payload.user.website_url] : undefined,
  };

  const coverSrc = resolveMediaUrl(payload.user.cover_path);
  const locationText = [payload.user.city, payload.user.state].filter(Boolean).join(" • ");
  const dubbingLanguages = payload.user.dubbing_languages ?? [];
  const accents = payload.user.voice_accents ?? [];
  const weeklyAvailability = mapLabeledValues(payload.user.weekly_availability, WEEKDAY_LABELS);
  const proposalContactLinks = payload.user.proposal_contact_links ?? {};
  const contactPreferences = mapLabeledValues(payload.user.proposal_contact_preferences, CONTACT_LABELS);
  const contactPreferencesWithLinks = (payload.user.proposal_contact_preferences ?? [])
    .map((key) => {
      if (key === "dm_plataforma") {
        return {
          key,
          label: CONTACT_LABELS[key] ?? key,
          value: null,
          href: `/${locale}/mensagens?com=${payload.user.id}`,
        };
      }

      const value = String(proposalContactLinks[key as keyof typeof proposalContactLinks] ?? "").trim();

      return {
        key,
        label: CONTACT_LABELS[key] ?? key,
        value: value || null,
        href: value ? resolveProposalContactHref(key, value) : null,
      };
    })
    .filter((item): item is { key: string; label: string; value: string | null; href: string | null } => item !== null);
  const equipment = mapLabeledValues(payload.user.recording_equipment, EQUIPMENT_LABELS);
  if (payload.user.recording_equipment_other?.trim()) {
    equipment.push(payload.user.recording_equipment_other.trim());
  }

  return (
    <section className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileSchema),
        }}
      />

      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Perfil" },
          { label: name },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
          <Users size={14} />
          {payload.summary.followers ?? 0} seguidores
        </span>
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-800">
          <UserPlus size={14} />
          {payload.summary.following ?? 0} seguindo
        </span>
        {isExternalPreview ? (
          <span className="inline-flex h-9 items-center rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 text-xs font-semibold text-[var(--color-ink)]">
            Visualização externa ativa
          </span>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div
          className="relative h-44 bg-[linear-gradient(135deg,#2b1642_0%,#9333ea_100%)] sm:h-52"
          style={coverSrc
            ? { backgroundImage: `url(${coverSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined}
        >
          <span className="absolute inset-0 bg-black/30" />

          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-end gap-3">
              <Avatar
                src={resolveMediaUrl(payload.user.avatar_path)}
                name={name}
                size="lg"
                className="h-20 w-20 rounded-[14px] border-2 border-white/80 shadow-xl"
              />
              <div className="min-w-0 text-white">
                <p className="line-clamp-1 text-xl font-semibold">{name}</p>
                <p className="line-clamp-1 text-sm text-white/85">
                  {payload.user.username ? `@${payload.user.username}` : "Sem @"} • {payload.user.locale ?? "pt-BR"}
                </p>
              </div>
            </div>

            {payload.user.website_url ? (
              <Link
                href={payload.user.website_url}
                className="inline-flex h-9 items-center rounded-[8px] border border-white/45 bg-black/25 px-3 text-sm font-semibold text-white backdrop-blur hover:bg-black/35"
              >
                Website
              </Link>
            ) : null}
          </div>
        </div>

        <CardBody className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {isExternalPreview ? (
              <>
                <Button
                  type="button"
                  variant="neutral"
                  disabled
                  title="Visualização externa: botão desativado neste modo."
                >
                  <MessageCircle size={14} />
                  Mensagem
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  disabled
                  title="Visualização externa: botão desativado neste modo."
                >
                  <Plus size={14} />
                  Seguir
                </Button>
              </>
            ) : (
              <>
                {Boolean(payload.viewer?.can_follow) ? (
                  <MessageUserButton
                    locale={locale}
                    userId={payload.user.id}
                    isAuthenticated={Boolean(token)}
                    canMessage={Boolean(payload.viewer?.can_message)}
                    reason={payload.viewer?.message_reason}
                  />
                ) : null}
                <FollowUserButton
                  userId={payload.user.id}
                  isAuthenticated={Boolean(token)}
                  canFollow={Boolean(payload.viewer?.can_follow)}
                  initialFollowing={Boolean(payload.viewer?.is_following)}
                />
              </>
            )}

            {isOwnProfileView ? (
              <div className="relative ml-auto">
                <details className="group relative">
                  <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[8px] border border-black/10 bg-white text-[var(--color-ink)] transition hover:bg-black/[0.03]">
                    <MoreHorizontal size={16} />
                  </summary>
                  <div className="absolute right-0 z-40 mt-2 w-56 rounded-[8px] border border-black/10 bg-white p-1 shadow-xl">
                    <Link
                      href={`/${locale}/perfil/editar`}
                      className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/[0.04]"
                    >
                      <Edit3 size={14} />
                      Editar perfil
                    </Link>
                    <Link
                      href={`/${locale}/perfil/${payload.user.id}?external_preview=1`}
                      className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/[0.04]"
                    >
                      <Eye size={14} />
                      Visualizar perfil externo
                    </Link>
                    <Link
                      href={`/${locale}/alterar-senha`}
                      className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/[0.04]"
                    >
                      <KeyRound size={14} />
                      Alterar senha
                    </Link>
                  </div>
                </details>
              </div>
            ) : null}
          </div>

          {payload.user.bio ? <p className="text-sm text-black/70">{payload.user.bio}</p> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[8px] border border-black/10 bg-black/[0.02] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/60">Informações</p>
              <div className="mt-2 space-y-2 text-sm text-black/75">
                {payload.user.pronouns ? <p className="block"><strong>Pronomes:</strong> {payload.user.pronouns}</p> : null}
                {locationText ? (
                  <div className="flex items-start gap-1.5">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span><strong>Local:</strong> {locationText}</span>
                  </div>
                ) : null}
                {dubbingLanguages.length > 0 ? (
                  <div className="flex items-start gap-1.5">
                    <Languages size={14} className="mt-0.5 shrink-0" />
                    <span><strong>Idiomas:</strong> {dubbingLanguages.join(", ")}</span>
                  </div>
                ) : null}
                {accents.length > 0 ? <p className="block"><strong>Sotaques:</strong> {accents.join(", ")}</p> : null}
              </div>
            </div>

            <div className="rounded-[8px] border border-black/10 bg-black/[0.02] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/60">Trabalho</p>
              <div className="mt-2 space-y-2 text-sm text-black/75">
                {payload.user.has_recording_equipment ? (
                  <div className="flex items-start gap-1.5">
                    <Mic size={14} className="mt-0.5 shrink-0" />
                    <span><strong>Equipamentos:</strong> {equipment.length > 0 ? equipment.join(", ") : "Possui equipamento de gravação"}</span>
                  </div>
                ) : null}
                {weeklyAvailability.length > 0 ? (
                  <div className="flex items-start gap-1.5">
                    <CalendarDays size={14} className="mt-0.5 shrink-0" />
                    <span><strong>Disponibilidade:</strong> {weeklyAvailability.join(", ")}</span>
                  </div>
                ) : null}
                {contactPreferences.length > 0 ? (
                  <div className="flex items-start gap-1.5">
                    <MessageSquareMore size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <strong>Propostas:</strong>{" "}
                      {contactPreferencesWithLinks.map((item, index) => (
                        <span key={item.key}>
                          {index > 0 ? ", " : ""}
                          {item.href ? (
                            item.href.startsWith("/") ? (
                              <Link
                                href={item.href}
                                className="underline decoration-black/30 underline-offset-2 hover:decoration-black/60"
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <a
                                href={item.href}
                                className="underline decoration-black/30 underline-offset-2 hover:decoration-black/60"
                                target={item.href.startsWith("http") ? "_blank" : undefined}
                                rel={item.href.startsWith("http") ? "noreferrer noopener" : undefined}
                              >
                                {item.label}
                              </a>
                            )
                          ) : item.value ? (
                            `${item.label}: ${item.value}`
                          ) : (
                            item.label
                          )}
                        </span>
                      ))}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[8px] border border-black/10 bg-black/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/60">
                  <Building2 size={14} />
                  Comunidades
                </p>
                <Link
                  href={showMoreCommunitiesHref}
                  className="text-xs font-semibold text-[var(--color-primary)] underline decoration-[var(--color-primary)]/40 underline-offset-2 hover:decoration-[var(--color-primary)]"
                >
                  Ver mais
                </Link>
              </div>
              {communities.length === 0 ? (
                <p className="mt-2 text-sm text-black/55">Nenhuma comunidade pública para exibir.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {visibleCommunities.map((community) => (
                    <Link
                      key={community.id}
                      href={`/${locale}/organizations/${community.slug}`}
                      className="flex items-center gap-2 rounded-[8px] border border-black/10 bg-white p-2 text-sm text-[var(--color-ink)]"
                    >
                      <Avatar src={resolveMediaUrl(community.avatar_path)} name={community.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold">{community.name}</p>
                        <p className="line-clamp-1 text-xs text-black/55">
                          {community.posts_count ?? 0} posts • {community.playlists_count ?? 0} playlists
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[8px] border border-black/10 bg-black/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/60">
                  <Trophy size={14} />
                  Conquistas
                </p>
                <Link
                  href={showMoreAchievementsHref}
                  className="text-xs font-semibold text-[var(--color-primary)] underline decoration-[var(--color-primary)]/40 underline-offset-2 hover:decoration-[var(--color-primary)]"
                >
                  Ver mais
                </Link>
              </div>
              {achievements.length === 0 ? (
                <p className="mt-2 text-sm text-black/55">Nenhuma conquista desbloqueada ainda.</p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {visibleAchievements.map((achievement) => {
                    const title =
                      achievement.level_definition?.title
                      ?? achievement.definition?.title
                      ?? "Conquista";
                    const icon =
                      achievement.level_definition?.icon
                      ?? achievement.definition?.icon
                      ?? "🏆";
                    const colorStart =
                      achievement.level_definition?.color_start
                      ?? achievement.definition?.color_start
                      ?? "#4c1d95";
                    const colorEnd =
                      achievement.level_definition?.color_end
                      ?? achievement.definition?.color_end
                      ?? "#9333ea";

                    return (
                      <div
                        key={achievement.id}
                        className="rounded-[8px] border border-black/10 px-2 py-2 text-sm text-white"
                        style={{ backgroundImage: `linear-gradient(135deg, ${colorStart}, ${colorEnd})` }}
                      >
                        <p className="line-clamp-1 font-semibold">{icon} {title}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardBody className="space-y-2 p-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Resumo</p>
              <div className="space-y-2 text-sm text-black/75">
                <p className="flex items-center justify-between"><span>Episódios</span><strong>{payload.summary.posts}</strong></p>
                <p className="flex items-center justify-between"><span>Curtidas</span><strong>{payload.summary.likes}</strong></p>
                <p className="flex items-center justify-between"><span>Visualizações</span><strong>{payload.summary.views}</strong></p>
                <p className="flex items-center justify-between"><span>Comunidades</span><strong>{payload.summary.organizations}</strong></p>
              </div>
            </CardBody>
          </Card>
        </aside>

        <div className="w-full space-y-4">
          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale as Locale} isAuthenticated={Boolean(token)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
