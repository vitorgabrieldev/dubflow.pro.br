import { notFound } from "next/navigation";

import { UptimeStatusBoard } from "@/components/status/uptime-status-board";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { isLocale } from "@/lib/i18n";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Status do sistema" },
        ]}
      />

      <UptimeStatusBoard />
    </section>
  );
}

