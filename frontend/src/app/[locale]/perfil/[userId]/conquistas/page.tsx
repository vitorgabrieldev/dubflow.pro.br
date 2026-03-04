import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";

import { renderAchievementIcon } from "@/components/profile/profile-achievements";
import { Card, CardBody } from "@/components/ui/card";
import { fetchCurrentUser } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type PublicAchievementsResponse = {
  user?: {
    id: number;
    name: string;
    stage_name?: string | null;
  };
  achievements?: PublicAchievement[];
};

type PublicAchievement = {
  id: number;
  level?: number;
  unlocked_at?: string | null;
  definition?: {
    id?: number | null;
    title?: string | null;
    description?: string | null;
    rarity?: string | null;
    icon?: string | null;
    color_start?: string | null;
    color_end?: string | null;
  } | null;
  level_definition?: {
    level?: number | null;
    title?: string | null;
    description?: string | null;
    rarity?: string | null;
    icon?: string | null;
    color_start?: string | null;
    color_end?: string | null;
  } | null;
};

const RARITY_LABELS: Record<string, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mythic: "Mítica",
};

export default async function UserAchievementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ page?: string; external_preview?: string; owner_view?: string }>;
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
  const requestedExternalPreview = query.external_preview === "1";
  const requestedOwnerView = query.owner_view === "1";
  const hasPreviewFlags = requestedExternalPreview || requestedOwnerView;
  const currentUser = token ? await fetchCurrentUser(token) : null;
  const isProfileOwner = Boolean(currentUser && currentUser.id === parsedUserId);

  if (hasPreviewFlags && !isProfileOwner) {
    const cleanParams = new URLSearchParams();
    if (query.page) {
      cleanParams.set("page", query.page);
    }
    const cleanHref = cleanParams.toString()
      ? `/${locale}/perfil/${userId}/conquistas?${cleanParams.toString()}`
      : `/${locale}/perfil/${userId}/conquistas`;
    redirect(cleanHref);
  }

  const isExternalPreview = requestedExternalPreview && isProfileOwner;
  const isOwnerView = requestedOwnerView && isProfileOwner;
  const requestToken = isExternalPreview ? undefined : token;

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const response = await fetch(
    `${apiBase}/users/${parsedUserId}?per_page=1&achievements_limit=200`,
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

  const payload = (await response.json()) as PublicAchievementsResponse;
  const user = payload.user;
  if (!user) {
    notFound();
  }

  const normalizedItems = normalizeAchievements(payload.achievements ?? []);
  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const perPage = 10;
  const total = normalizedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageItems = normalizedItems.slice(startIndex, startIndex + perPage);

  const profileName = user.stage_name?.trim() || user.name;
  const backParams = new URLSearchParams();
  if (isExternalPreview) {
    backParams.set("external_preview", "1");
  }
  if (isOwnerView) {
    backParams.set("owner_view", "1");
  }
  const backToProfileHref = backParams.toString()
    ? `/${locale}/perfil/${user.id}?${backParams.toString()}`
    : `/${locale}/perfil/${user.id}`;

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (isExternalPreview) {
      params.set("external_preview", "1");
    }
    if (isOwnerView) {
      params.set("owner_view", "1");
    }
    return `/${locale}/perfil/${user.id}/conquistas?${params.toString()}`;
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Trophy size={16} />
              Conquistas de {profileName}
            </p>
            <p className="text-xs text-black/60">{total} conquistas desbloqueadas</p>
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
            <p className="text-sm text-black/65">Este perfil ainda não desbloqueou conquistas.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {pageItems.map((item) => {
                const title = item.level_definition?.title || item.definition?.title || "Conquista";
                const description = item.level_definition?.description || item.definition?.description || null;
                const rarity = item.level_definition?.rarity || item.definition?.rarity || "common";
                const icon = item.level_definition?.icon || item.definition?.icon || "trophy";
                const colorStart = item.level_definition?.color_start || item.definition?.color_start || "#6d28d9";
                const colorEnd = item.level_definition?.color_end || item.definition?.color_end || "#9333ea";

                return (
                  <article
                    key={item.id}
                    className="rounded-[12px] border border-black/10 p-3"
                    style={{
                      boxShadow: `0 28px 48px -30px ${withAlpha(colorStart, 0.94)}`,
                      background: `linear-gradient(145deg, ${withAlpha(colorStart, 0.24)} 0%, ${withAlpha(colorEnd, 0.18)} 40%, rgba(255,255,255,0.96) 100%)`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-white"
                        style={{
                          borderColor: withAlpha(colorEnd, 0.65),
                          background: `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`,
                        }}
                      >
                        {renderAchievementIcon(icon, 17)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{title}</p>
                          <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-black/65">
                            {RARITY_LABELS[rarity] ?? rarity}
                          </span>
                          <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-black/65">
                            Nv {item.level_definition?.level ?? item.level ?? 1}
                          </span>
                        </div>
                        {description ? <p className="mt-1 text-xs text-black/65">{description}</p> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
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

function normalizeAchievements(rows: PublicAchievement[]) {
  const byDefinition = new Map<string, PublicAchievement>();

  for (const row of rows) {
    const definitionKey = row.definition?.id ? `def:${row.definition.id}` : `ua:${row.id}`;
    const previous = byDefinition.get(definitionKey);
    if (!previous) {
      byDefinition.set(definitionKey, row);
      continue;
    }

    const previousLevel = previous.level_definition?.level ?? previous.level ?? 0;
    const nextLevel = row.level_definition?.level ?? row.level ?? 0;
    if (nextLevel > previousLevel) {
      byDefinition.set(definitionKey, row);
    }
  }

  return [...byDefinition.values()].sort((a, b) => {
    const aDate = a.unlocked_at ? Date.parse(a.unlocked_at) : 0;
    const bDate = b.unlocked_at ? Date.parse(b.unlocked_at) : 0;
    if (aDate !== bDate) {
      return bDate - aDate;
    }

    const aLevel = a.level_definition?.level ?? a.level ?? 0;
    const bLevel = b.level_definition?.level ?? b.level ?? 0;
    return bLevel - aLevel;
  });
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.trim().replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, alpha));

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return hex;
  }

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}
