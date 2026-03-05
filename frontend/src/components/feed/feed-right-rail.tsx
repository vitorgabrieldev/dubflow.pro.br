import Image from "next/image";
import Link from "next/link";
import { Flame, MessageCircle, Trophy, UsersRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardBody } from "@/components/ui/card";
import { resolveMediaUrl } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { Post, RisingDubberInsight } from "@/types/api";

type FeedRightRailProps = {
  locale: Locale;
  posts: Post[];
  risingDubbers?: RisingDubberInsight[];
};

type RisingDubber = {
  id: number;
  name: string;
  username: string | null;
  avatarPath: string | null;
  score: number;
  episodesLaunched: number;
  roleSubmissions: number;
  testsCreated: number;
};

export function FeedRightRail({ locale, posts, risingDubbers = [] }: FeedRightRailProps) {
  const topWeeklyPost = resolveTopWeeklyPost(posts);
  const risingDubbersForCard = risingDubbers.length > 0
    ? mapInsightToRisingDubbers(risingDubbers).slice(0, 5)
    : resolveRisingDubbers(posts).slice(0, 5);

  return (
    <aside className="space-y-3 xl:sticky xl:top-24">
      <Card data-tour-id="home-rail-30days">
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <UsersRound size={15} />
            Últimos 30 dias
          </p>

          {risingDubbersForCard.length === 0 ? (
            <EmptyState inline />
          ) : (
            <div className="space-y-2">
              {risingDubbersForCard.map((dubber, index) => (
                <Link
                  key={dubber.id}
                  href={`/${locale}/perfil/${dubber.id}`}
                  className={`flex items-center gap-2 rounded-[8px] px-2.5 py-2 transition ${
                    index < 3
                      ? "relative isolate overflow-hidden border border-[var(--color-primary)]/35 bg-[linear-gradient(90deg,rgba(255,237,213,0.55)_0%,rgba(255,255,255,0.95)_65%)] shadow-[0_10px_24px_-18px_rgba(249,115,22,0.8)] hover:bg-[linear-gradient(90deg,rgba(255,237,213,0.75)_0%,rgba(255,255,255,0.95)_65%)]"
                      : "border border-black/10 bg-white hover:bg-black/[0.02]"
                  }`}
                >
                  {index < 3 ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(251,146,60,0.18)_45%,rgba(253,186,116,0.28)_65%,rgba(255,255,255,0)_100%)] blur-[2px] animate-[skeleton-wave_2.6s_linear_infinite]"
                    />
                  ) : null}

                  <span className="relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-ink)]">
                    {index + 1}
                  </span>

                  <span className="relative z-[1]">
                    <Avatar src={resolveMediaUrl(dubber.avatarPath)} name={dubber.name} size="sm" />
                  </span>

                  <span className="relative z-[1] min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{dubber.name}</span>
                    <span className="block truncate text-xs text-black/55">
                      {dubber.username ? `@${dubber.username}` : "sem @"} • {dubber.episodesLaunched} episódios
                    </span>
                    <span className="block truncate text-[11px] text-black/45">
                      {dubber.roleSubmissions} inscrições • {dubber.testsCreated} testes
                    </span>
                  </span>

                  <span className="relative z-[1] inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                    {index < 3 ? (
                      <Image
                        src="/badges/top-fire.gif"
                        alt="Top destaque"
                        width={14}
                        height={14}
                        unoptimized
                        className="h-[14px] w-[14px]"
                      />
                    ) : (
                      <Flame size={13} className="text-[var(--color-primary)]" />
                    )}
                    {Math.round(dubber.score)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card data-tour-id="home-rail-top-week">
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Trophy size={15} />
            Top post da semana
          </p>

          {topWeeklyPost ? (
            <div className="rounded-[8px] border border-black/10 bg-white px-3 py-3">
              <Link
                href={`/${locale}/post/${topWeeklyPost.id}`}
                className="line-clamp-2 text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
              >
                {topWeeklyPost.title}
              </Link>
              <p className="mt-1 line-clamp-1 text-xs text-black/60">
                {topWeeklyPost.organization?.slug ? (
                  <Link href={`/${locale}/organizations/${topWeeklyPost.organization.slug}`} className="hover:text-[var(--color-primary)]">
                    {topWeeklyPost.organization?.name ?? "-"}
                  </Link>
                ) : (
                  <span>{topWeeklyPost.organization?.name ?? "-"}</span>
                )}{" "}
                •{" "}
                {topWeeklyPost.author?.id ? (
                  <Link href={`/${locale}/perfil/${topWeeklyPost.author.id}`} className="hover:text-[var(--color-primary)]">
                    {topWeeklyPost.author?.stage_name ?? topWeeklyPost.author?.name ?? "-"}
                  </Link>
                ) : (
                  <span>{topWeeklyPost.author?.stage_name ?? topWeeklyPost.author?.name ?? "-"}</span>
                )}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-black/65">
                <Link
                  href={`/${locale}/post/${topWeeklyPost.id}`}
                  className="rounded-[6px] bg-black/5 px-2 py-1 transition-colors hover:bg-black/10"
                >
                  {topWeeklyPost.views_count} views
                </Link>
                <Link
                  href={`/${locale}/post/${topWeeklyPost.id}`}
                  className="rounded-[6px] bg-black/5 px-2 py-1 transition-colors hover:bg-black/10"
                >
                  {topWeeklyPost.likes_count} likes
                </Link>
                <Link
                  href={`/${locale}/post/${topWeeklyPost.id}`}
                  className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1 transition-colors hover:bg-black/10"
                >
                  <MessageCircle size={11} />
                  {topWeeklyPost.comments_count}
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState inline />
          )}
        </CardBody>
      </Card>
    </aside>
  );
}

function resolveTopWeeklyPost(posts: Post[]): Post | null {
  if (posts.length === 0) {
    return null;
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyPosts = posts.filter((post) => {
    if (!post.published_at) {
      return false;
    }

    const date = new Date(post.published_at);
    return !Number.isNaN(date.getTime()) && date.getTime() >= weekAgo;
  });

  const pool = weeklyPosts.length > 0 ? weeklyPosts : posts;

  return [...pool].sort((a, b) => scorePost(b) - scorePost(a))[0] ?? null;
}

function resolveRisingDubbers(posts: Post[]): RisingDubber[] {
  const map = new Map<number, RisingDubber>();

  for (const post of posts) {
    if (!post.author?.id) {
      continue;
    }

    const id = post.author.id;
    const current = map.get(id);
    const postScore = scorePost(post);

    if (!current) {
      map.set(id, {
        id,
        name: post.author.stage_name ?? post.author.name,
        username: post.author.username,
        avatarPath: post.author.avatar_path ?? null,
        score: postScore,
        episodesLaunched: 1,
        roleSubmissions: 0,
        testsCreated: 0,
      });
      continue;
    }

    const nextScore = current.score + postScore;

    map.set(id, {
      ...current,
      score: nextScore,
      episodesLaunched: current.episodesLaunched + 1,
    });
  }

  return [...map.values()].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.episodesLaunched - a.episodesLaunched;
  });
}

function mapInsightToRisingDubbers(insights: RisingDubberInsight[]): RisingDubber[] {
  return insights.map((item) => ({
    id: item.id,
    name: item.name,
    username: item.username,
    avatarPath: item.avatar_path ?? null,
    score: item.score ?? 0,
    episodesLaunched: item.metrics?.episodes_launched ?? 0,
    roleSubmissions: item.metrics?.role_submissions ?? 0,
    testsCreated: item.metrics?.tests_created ?? 0,
  }));
}

function scorePost(post: Post): number {
  const likes = post.likes_count ?? 0;
  const comments = post.comments_count ?? 0;
  const views = post.views_count ?? 0;
  const base = likes * 3 + comments * 4 + views * 0.08;

  if (!post.published_at) {
    return base;
  }

  const publishedAt = new Date(post.published_at);
  if (Number.isNaN(publishedAt.getTime())) {
    return base;
  }

  const daysAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  const freshnessMultiplier = daysAgo <= 7 ? 1.3 : daysAgo <= 30 ? 1.15 : 1;

  return base * freshnessMultiplier;
}
