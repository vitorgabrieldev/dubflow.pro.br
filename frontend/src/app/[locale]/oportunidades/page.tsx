import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";

import { OpportunitiesFilters } from "@/components/opportunity/opportunities-filters";
import { OpportunitiesStream } from "@/components/opportunity/opportunities-stream";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";
import { fetchDubbingTestOpportunitiesPage } from "@/lib/api";
import type { DubbingTestAppearanceEstimate } from "@/types/api";

type OpportunitiesSearch = {
  q?: string;
  visibility?: "internal" | "external";
  appearance?: DubbingTestAppearanceEstimate;
};

export default async function OpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<OpportunitiesSearch>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const visibility = query.visibility;
  const appearance = query.appearance;

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  const payload = await fetchDubbingTestOpportunitiesPage({
    token,
    page: 1,
    perPage: 12,
    q,
    visibility,
    appearance,
  }).catch(() => ({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            <Megaphone size={13} />
            Oportunidades
          </p>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Teste de dublagem aberto</h1>
          <p className="text-sm text-black/60">
            Encontre oportunidades por comunidade, personagem e perfil de aparição.
          </p>
        </div>

        <Link href={`/${locale}/minhas-organizacoes`}>
          <Button variant="neutral">Gerenciar comunidades</Button>
        </Link>
      </div>

      <OpportunitiesFilters
        locale={locale}
        initialQuery={q}
        initialVisibility={visibility ?? "all"}
        initialAppearance={appearance ?? "all"}
      />

      <OpportunitiesStream
        key={`${locale}:${q}:${visibility ?? "all"}:${appearance ?? "all"}`}
        locale={locale}
        initialItems={payload.data ?? []}
        initialPage={payload.current_page ?? 1}
        initialLastPage={payload.last_page ?? 1}
        query={{ q, visibility, appearance }}
      />
    </section>
  );
}
