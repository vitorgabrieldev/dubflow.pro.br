import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Clapperboard, FolderTree, ShieldCheck, Sparkles, Users } from "lucide-react";

import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { Card, CardBody } from "@/components/ui/card";
import { isLocale } from "@/lib/i18n";

export default async function NewOrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  return (
    <section className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardBody className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                <Sparkles size={14} />
                Nova comunidade
              </p>
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Criar comunidade</h1>
            <p className="text-sm text-black/65">
              Preencha os dados abaixo para começar sua comunidade e publicar dublagens por playlist e temporada.
            </p>
          </div>

          <CreateOrganizationForm locale={locale} />
        </CardBody>
      </Card>

      <aside className="relative hidden overflow-hidden rounded-[8px] border border-white/35 bg-[linear-gradient(145deg,#2b1642_0%,#6a21a8_55%,#9333ea_100%)] text-white shadow-[0_24px_64px_-30px_rgba(67,20,120,0.85)] lg:flex">
        <span className="auth-glow-one pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <span className="auth-glow-two pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-6">
          <div className="space-y-3">
            <p className="inline-flex w-fit items-center gap-2 rounded-[6px] bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles size={13} />
              Comunidade
            </p>
            <h2 className="text-2xl font-semibold leading-tight">Monte sua comunidade de dublagem</h2>
            <p className="text-sm leading-6 text-white/88">
              Estruture sua equipe, centralize playlists e publique episódios com padrão profissional.
            </p>
          </div>

          <div className="space-y-2 text-sm text-white/92">
            <p className="inline-flex items-center gap-2">
              <Users size={14} className="shrink-0" />
              Membros e papéis por comunidade
            </p>
            <p className="inline-flex items-center gap-2">
              <Building2 size={14} className="shrink-0" />
              Comunidade pública ou privada
            </p>
            <p className="inline-flex items-center gap-2">
              <Clapperboard size={14} className="shrink-0" />
              Publicação de episódios em fluxo contínuo
            </p>
            <p className="inline-flex items-center gap-2">
              <FolderTree size={14} className="shrink-0" />
              Comunidade por playlist, temporada e episódio
            </p>
            <p className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0" />
              Controle de entrada e colaboração dos membros
            </p>
          </div>

          <Link
            href={`/${locale}/publicar`}
            className="inline-flex h-10 items-center gap-2 self-start rounded-[8px] border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={14} />
            Voltar para publicar
          </Link>
        </div>
      </aside>
    </section>
  );
}
