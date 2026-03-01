import Link from "next/link";
import { headers } from "next/headers";
import { SearchX } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export default async function NotFound() {
  const headerStore = await headers();
  const requestLocale = headerStore.get("x-dubflow-locale");
  const locale = requestLocale && isLocale(requestLocale) ? requestLocale : DEFAULT_LOCALE;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full">
        <CardBody className="space-y-4 p-6 text-center sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            <SearchX size={14} />
            Erro 404
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Página não encontrada</h1>
          <p className="text-sm text-black/65">
            O endereço pode estar incorreto ou o conteúdo foi movido.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href={`/${locale}`}
              className="inline-flex h-10 items-center rounded-[8px] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
            >
              Voltar ao feed
            </Link>
            <Link
              href={`/${locale}/comunidades`}
              className="inline-flex h-10 items-center rounded-[8px] border border-black/15 bg-white px-4 text-sm font-semibold text-[var(--color-ink)]"
            >
              Explorar comunidades
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
