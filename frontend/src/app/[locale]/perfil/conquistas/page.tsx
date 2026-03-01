import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";

import { ProfileAchievementsCatalog } from "@/components/profile/profile-achievements";
import { Card, CardBody } from "@/components/ui/card";
import { fetchMyAchievements } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function ProfileAchievementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const catalog = await fetchMyAchievements(token);

  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) ? 1 : parsedPage;

  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
            <Trophy size={16} />
            Conquistas
          </p>

          <Link
            href={`/${locale}/perfil`}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} />
            Voltar ao perfil
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-4">
          <ProfileAchievementsCatalog locale={locale} catalog={catalog} page={page} perPage={8} />
        </CardBody>
      </Card>
    </section>
  );
}
