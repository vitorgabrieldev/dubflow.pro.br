import Link from "next/link";
import {
  AlarmClock,
  AudioLines,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clapperboard,
  CloudRain,
  Crown,
  Factory,
  FileAudio,
  Library,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Mic2,
  MicVocal,
  RadioTower,
  Rocket,
  ScissorsLineDashed,
  SearchCheck,
  Send,
  Sparkles,
  Star,
  Swords,
  ThumbsUp,
  Timer,
  Trophy,
  Tv,
  UsersRound,
} from "lucide-react";

import type { AchievementCatalogResponse, AchievementItem } from "@/types/api";

const RARITY_LABELS: Record<string, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mythic: "Mítica",
};

export function ProfileAchievementsPreview({
  locale,
  catalog,
  limit = 8,
}: {
  locale: string;
  catalog: AchievementCatalogResponse | null;
  limit?: number;
}) {
  if (!catalog) {
    return (
      <section className="space-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Trophy size={15} />
          Minhas conquistas
        </p>
        <p className="text-sm text-black/65">Não foi possível carregar as conquistas agora.</p>
      </section>
    );
  }

  const items = [...catalog.items]
    .sort((a, b) => {
      const aUnlocked = a.user_status.is_unlocked ? 1 : 0;
      const bUnlocked = b.user_status.is_unlocked ? 1 : 0;

      if (aUnlocked !== bUnlocked) {
        return bUnlocked - aUnlocked;
      }

      return (b.user_status.highest_level ?? 0) - (a.user_status.highest_level ?? 0);
    })
    .slice(0, Math.max(1, limit));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Trophy size={15} />
          Minhas conquistas
        </p>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-black/65">
          {catalog.summary.unlocked_achievements}/{catalog.summary.total_achievements} desbloqueadas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((achievement) => {
          const highestLevel = achievement.levels
            .filter((level) => level.is_unlocked)
            .sort((a, b) => b.level - a.level)[0] || null;

          const unlocked = achievement.user_status.is_unlocked;
          const colorStart = highestLevel?.color_start || achievement.color_start;
          const colorEnd = highestLevel?.color_end || achievement.color_end;
          const iconName = highestLevel?.icon || achievement.icon;

          return (
            <div
              key={achievement.id}
              className={`flex items-center gap-3 rounded-[9px] border px-3 py-2 ${
                unlocked ? "border-black/10 bg-white" : "border-black/10 bg-black/[0.03]"
              }`}
              style={
                unlocked
                  ? {
                      boxShadow: `0 18px 32px -24px ${withAlpha(colorStart, 0.9)}`,
                      background: `linear-gradient(145deg, ${withAlpha(colorStart, 0.22)} 0%, ${withAlpha(colorEnd, 0.16)} 38%, rgba(255,255,255,0.98) 100%)`,
                    }
                  : undefined
              }
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  unlocked ? "text-white" : "border-black/10 bg-black/5 text-black/45"
                }`}
                style={
                  unlocked
                    ? {
                        background: `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`,
                        borderColor: withAlpha(colorEnd, 0.7),
                      }
                    : undefined
                }
              >
                {renderAchievementIcon(iconName, 14)}
              </span>

              <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{achievement.title}</p>
            </div>
          );
        })}
      </div>

      <Link
        href={`/${locale}/perfil/conquistas`}
        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 text-sm font-semibold text-[var(--color-ink)]"
      >
        <Sparkles size={14} />
        Ver todas as conquistas
      </Link>
    </section>
  );
}

export function ProfileAchievementsCatalog({
  locale,
  catalog,
  page,
  perPage,
}: {
  locale: string;
  catalog: AchievementCatalogResponse | null;
  page: number;
  perPage: number;
}) {
  if (!catalog) {
    return <p className="text-sm text-black/65">Não foi possível carregar as conquistas agora.</p>;
  }

  const achievements = catalog.items;
  const total = achievements.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageItems = achievements.slice(startIndex, startIndex + perPage);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Trophy size={15} />
          Todas as conquistas
        </p>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-black/65">
          {catalog.summary.unlocked_achievements}/{catalog.summary.total_achievements} desbloqueadas
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {pageItems.map((achievement, index) => (
          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-black/10 bg-white px-3 py-2">
        <p className="text-xs text-black/60">
          Página {currentPage} de {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={currentPage > 1 ? `/${locale}/perfil/conquistas?page=${currentPage - 1}` : `/${locale}/perfil/conquistas?page=1`}
            className={`inline-flex h-8 items-center rounded-[8px] border px-3 text-xs font-semibold ${
              currentPage > 1
                ? "border-black/10 bg-white text-[var(--color-ink)]"
                : "pointer-events-none border-black/10 bg-black/[0.04] text-black/35"
            }`}
          >
            Anterior
          </Link>

          <Link
            href={currentPage < totalPages ? `/${locale}/perfil/conquistas?page=${currentPage + 1}` : `/${locale}/perfil/conquistas?page=${totalPages}`}
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
    </section>
  );
}

function AchievementCard({ achievement, index }: { achievement: AchievementItem; index: number }) {
  const highestLevel = achievement.levels
    .filter((level) => level.is_unlocked)
    .sort((a, b) => b.level - a.level)[0] || null;

  const unlocked = achievement.user_status.is_unlocked;
  const colorStart = highestLevel?.color_start || achievement.color_start;
  const colorEnd = highestLevel?.color_end || achievement.color_end;
  const rarity = highestLevel?.rarity || achievement.rarity;
  const iconName = highestLevel?.icon || achievement.icon;

  const nextThreshold = achievement.progress.next_threshold;
  const completion = nextThreshold
    ? Math.max(0, Math.min(100, Math.round((achievement.progress.value / nextThreshold) * 100)))
    : 100;

  return (
    <article
      className={`achievement-card-enter overflow-hidden rounded-[12px] border p-3 transition duration-300 ${
        unlocked ? "border-black/5 bg-white" : "border-black/10 bg-black/[0.03]"
      }`}
      style={{
        animationDelay: `${Math.min(index * 30, 280)}ms`,
        boxShadow: unlocked
          ? `0 30px 56px -36px ${withAlpha(colorStart, 0.96)}, inset 0 0 0 1px ${withAlpha(colorEnd, 0.45)}`
          : "inset 0 0 0 1px rgba(0,0,0,0.04)",
        background: unlocked
          ? `linear-gradient(145deg, ${withAlpha(colorStart, 0.24)} 0%, ${withAlpha(colorEnd, 0.18)} 40%, rgba(255,255,255,0.95) 100%)`
          : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
            unlocked ? "text-white" : "border-black/10 bg-black/5 text-black/45"
          }`}
          style={
            unlocked
              ? {
                  background: `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`,
                  borderColor: withAlpha(colorEnd, 0.65),
                }
              : undefined
          }
        >
          {renderAchievementIcon(iconName, 17)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{achievement.title}</p>
            <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-black/65">
              {RARITY_LABELS[rarity ?? "common"] ?? rarity}
            </span>
            <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-black/65">
              Nv {achievement.user_status.highest_level || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-black/60">{achievement.description}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completion}%`,
              background: unlocked
                ? `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`
                : "linear-gradient(135deg,#9CA3AF 0%,#D1D5DB 100%)",
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/60">
          <span className="rounded-full bg-black/5 px-2 py-1">Progresso: {achievement.progress.value}</span>
          {achievement.progress.next_threshold ? (
            <span className="rounded-full bg-black/5 px-2 py-1">Próximo: {achievement.progress.next_threshold}</span>
          ) : (
            <span className="rounded-full bg-black/5 px-2 py-1">Nível máximo alcançado</span>
          )}
          <span className="rounded-full bg-black/5 px-2 py-1">
            {achievement.stats.holders_count} dubladores ({achievement.stats.holders_percentage}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {achievement.levels.map((level) => (
            <span
              key={level.id}
              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold"
              style={
                level.is_unlocked
                  ? {
                      color: "white",
                      borderColor: withAlpha(level.color_end || colorEnd, 0.65),
                      background: `linear-gradient(135deg, ${level.color_start || colorStart} 0%, ${level.color_end || colorEnd} 100%)`,
                    }
                  : {
                      borderColor: "rgba(0,0,0,0.12)",
                      background: "rgba(0,0,0,0.04)",
                      color: "rgba(0,0,0,0.55)",
                    }
              }
            >
              {level.level}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function renderAchievementIcon(name: string, size: number) {
  switch (name) {
    case "alarm-clock":
      return <AlarmClock size={size} />;
    case "audio-lines":
      return <AudioLines size={size} />;
    case "bar-chart-3":
      return <BarChart3 size={size} />;
    case "calendar-check":
      return <CalendarCheck size={size} />;
    case "calendar-clock":
      return <CalendarClock size={size} />;
    case "calendar-days":
      return <CalendarDays size={size} />;
    case "clapperboard":
      return <Clapperboard size={size} />;
    case "cloud-rain":
      return <CloudRain size={size} />;
    case "crown":
      return <Crown size={size} />;
    case "factory":
      return <Factory size={size} />;
    case "file-audio":
      return <FileAudio size={size} />;
    case "library":
      return <Library size={size} />;
    case "megaphone":
      return <Megaphone size={size} />;
    case "message-circle":
      return <MessageCircle size={size} />;
    case "messages-square":
      return <MessagesSquare size={size} />;
    case "mic-2":
      return <Mic2 size={size} />;
    case "mic-vocal":
      return <MicVocal size={size} />;
    case "radio-tower":
      return <RadioTower size={size} />;
    case "rocket":
      return <Rocket size={size} />;
    case "scissors-line-dashed":
      return <ScissorsLineDashed size={size} />;
    case "search-check":
      return <SearchCheck size={size} />;
    case "send":
      return <Send size={size} />;
    case "sparkles":
      return <Sparkles size={size} />;
    case "star":
      return <Star size={size} />;
    case "swords":
      return <Swords size={size} />;
    case "thumbs-up":
      return <ThumbsUp size={size} />;
    case "timer":
      return <Timer size={size} />;
    case "tv":
      return <Tv size={size} />;
    case "users-round":
      return <UsersRound size={size} />;
    default:
      return <Trophy size={size} />;
  }
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
