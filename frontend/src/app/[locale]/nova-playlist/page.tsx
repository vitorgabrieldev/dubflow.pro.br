import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clapperboard, FolderTree, Mic2, Sparkles, Video } from "lucide-react";

import { CreatePlaylistForm } from "@/components/playlist/create-playlist-form";
import { Card, CardBody } from "@/components/ui/card";
import { fetchMyOrganizations } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function NewPlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organization?: string; created?: string; error?: string }>;
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

  const query = await searchParams;
  const organizations = (await fetchMyOrganizations(token)).filter(
    (organization) => organization.viewer?.role === "owner" || organization.viewer?.role === "admin"
  );
  const initialOrganizationSlug =
    organizations.find((organization) => organization.slug === query.organization)?.slug ?? organizations[0]?.slug ?? "";

  return (
    <section className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardBody className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              <Sparkles size={14} />
              Nova playlist
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Criar playlist</h1>
            <p className="text-sm text-black/65">
              Crie uma playlist para organizar episódios por obra, temporada e evolução do projeto.
            </p>
          </div>

          {query.created === "1" ? (
            <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Playlist criada com sucesso.
            </p>
          ) : null}

          {query.error === "1" ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível criar a playlist.
            </p>
          ) : null}

          {organizations.length === 0 ? (
            <div className="space-y-3 rounded-[8px] border border-black/10 bg-black/[0.02] p-4">
              <p className="text-sm text-black/70">Você precisa participar de uma comunidade para criar playlists.</p>
              <Link
                href={`/${locale}/nova-organizacao`}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                <FolderTree size={14} />
                Criar comunidade
              </Link>
            </div>
          ) : (
            <CreatePlaylistForm locale={locale} organizations={organizations} initialOrganizationSlug={initialOrganizationSlug} />
          )}
        </CardBody>
      </Card>

      <aside className="relative hidden overflow-hidden rounded-[8px] border border-white/35 bg-[linear-gradient(145deg,#2b1642_0%,#6a21a8_55%,#9333ea_100%)] text-white shadow-[0_24px_64px_-30px_rgba(67,20,120,0.85)] lg:flex">
        <span className="auth-glow-one pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <span className="auth-glow-two pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-6">
          <div className="space-y-3">
            <p className="inline-flex w-fit items-center gap-2 rounded-[6px] bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles size={13} />
              Playlist
            </p>
            <h2 className="text-2xl font-semibold leading-tight">Organize sua obra com fluxo profissional</h2>
            <p className="text-sm leading-6 text-white/88">
              Centralize episódios, facilite temporadas e mantenha o catálogo pronto para crescer.
            </p>
          </div>

          <div className="space-y-2 text-sm text-white/92">
            <p className="inline-flex items-center gap-2">
              <Clapperboard size={14} className="shrink-0" />
              Estrutura por obra e coleção
            </p>
            <p className="inline-flex items-center gap-2">
              <FolderTree size={14} className="shrink-0" />
              Comunidade por temporadas
            </p>
            <p className="inline-flex items-center gap-2">
              <Video size={14} className="shrink-0" />
              Episódios de vídeo com sequência clara
            </p>
            <p className="inline-flex items-center gap-2">
              <Mic2 size={14} className="shrink-0" />
              Catálogo contínuo de projetos de voz
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
