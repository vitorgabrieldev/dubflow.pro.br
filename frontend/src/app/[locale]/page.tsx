import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FeedRightRail } from "@/components/feed/feed-right-rail";
import { FeedStream } from "@/components/feed/feed-stream";
import { fetchFeedPage, fetchRisingDubbers30Days } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const authToken = cookieStore.get("ed_token")?.value;
  const isAuthenticated = Boolean(authToken);

  const [feed, risingDubbers] = await Promise.all([
    fetchFeedPage({
      token: authToken,
      page: 1,
      perPage: 12,
    }).catch(() => ({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 12,
      total: 0,
    })),
    fetchRisingDubbers30Days(authToken),
  ]);

  const postsForRail = feed.data ?? [];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <FeedStream
        locale={locale as Locale}
        isAuthenticated={isAuthenticated}
        initialPosts={feed.data ?? []}
        initialPage={feed.current_page ?? 1}
        initialLastPage={feed.last_page ?? 1}
      />

      <FeedRightRail locale={locale as Locale} posts={postsForRail} risingDubbers={risingDubbers} />
    </section>
  );
}
