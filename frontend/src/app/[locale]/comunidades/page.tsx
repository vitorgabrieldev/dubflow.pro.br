import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { CommunitiesStream } from "@/components/community/communities-stream";
import { fetchOrganizationsPage } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type CommunitiesSearch = {
  q?: string;
  sort?: "recent" | "followers" | "playlists" | "name";
};

export default async function CommunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CommunitiesSearch>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const sort = query.sort ?? "recent";

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const isAuthenticated = Boolean(token);

  const payload = await fetchOrganizationsPage({
    token,
    page: 1,
    perPage: 12,
    q,
    sort,
    discoverPrivate: true,
    excludeJoined: true,
  }).catch(() => ({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  }));

  return (
    <section className="space-y-4">
      <CommunitiesStream
        key={`${locale}:${q}:${sort}`}
        locale={locale}
        isAuthenticated={isAuthenticated}
        initialItems={payload.data ?? []}
        initialPage={payload.current_page ?? 1}
        initialLastPage={payload.last_page ?? 1}
        query={{ q, sort, excludeJoined: true }}
      />
    </section>
  );
}
