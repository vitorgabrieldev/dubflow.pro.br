import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  Clapperboard,
  FolderTree,
  PlusCircle,
  Upload,
  UserRound,
} from "lucide-react";

import { PublishEpisodeForm } from "@/components/publish/publish-episode-form";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { fetchCurrentUser, fetchMyOrganizations, fetchPublishOptions, resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type PublishSearch = {
  post_created?: string;
  post_error?: string;
  post_error_message?: string;
};

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PublishSearch>;
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

  const [query, me, organizations, publishOptions] = await Promise.all([
    searchParams,
    fetchCurrentUser(token),
    fetchMyOrganizations(token),
    fetchPublishOptions(token),
  ]);
  const playlistManagerOrganizations = organizations.filter(
    (organization) => organization.viewer?.role === "owner" || organization.viewer?.role === "admin"
  );

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar src={resolveMediaUrl(me?.avatar_path)} name={me?.name} size="lg" />
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                  <UserRound size={15} />
                  {me?.stage_name ?? me?.name ?? "Sua conta"}
                </p>
                <p className="line-clamp-1 text-sm text-black/60">{me?.name ?? "Perfil DubFlow"}</p>
              </div>
            </div>

            <p className="text-sm text-black/70">
              A publicação acontece dentro das suas comunidades e playlists, com temporadas por episódio.
            </p>

            <Link
              href={`/${locale}/minhas-organizacoes`}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              <Building2 size={14} />
              Ver minhas comunidades
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 p-4">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Upload size={16} />
              Publicar episódio
            </p>

            {query.post_created === "1" ? (
              <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Episódio publicado com sucesso.
              </p>
            ) : null}

            {query.post_error === "1" ? (
              <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {query.post_error_message?.trim() || "Não foi possível publicar este episódio."}
              </p>
            ) : null}

            {publishOptions.length === 0 ? (
              <p className="text-sm text-black/55">
                Você precisa participar de ao menos uma comunidade para publicar episódios.
              </p>
            ) : (
              <PublishEpisodeForm locale={locale} options={publishOptions} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 p-4">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <FolderTree size={16} />
              Minhas comunidades
            </p>

            {organizations.length === 0 ? (
              <p className="text-sm text-black/55">Você ainda não participa de nenhuma comunidade.</p>
            ) : (
              <div className="space-y-2">
                {organizations.map((organization) => (
                  <Link
                    key={organization.id}
                    href={`/${locale}/organizations/${organization.slug}`}
                    className="flex items-center justify-between rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm text-black/75"
                  >
                    <span className="line-clamp-1 inline-flex items-center gap-2">
                      <Building2 size={14} />
                      {organization.name}
                    </span>
                    <span className="shrink-0 text-xs text-black/50">{organization.playlists_count ?? 0} playlists</span>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card id="criar-organizacao">
          <CardBody className="space-y-4 p-4">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Building2 size={16} />
              Comunidade
            </p>

            <p className="text-sm text-black/65">
              A criação de comunidade agora está em uma tela dedicada para ficar mais rápida e dinâmica.
            </p>

            <Link
              href={`/${locale}/nova-organizacao`}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              <PlusCircle size={14} />
              Criar nova comunidade
            </Link>
          </CardBody>
        </Card>

        <Card id="criar-playlist">
          <CardBody className="space-y-4 p-4">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Clapperboard size={16} />
              Criar playlist
            </p>

            <p className="text-sm text-black/65">Crie uma nova playlist para organizar seus episódios.</p>

            {playlistManagerOrganizations.length > 0 ? (
              <Link
                href={`/${locale}/nova-playlist`}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                <PlusCircle size={14} />
                Criar nova playlist
              </Link>
            ) : (
              <p className="text-sm text-black/55">Somente dono ou colaborador podem criar playlists.</p>
            )}
          </CardBody>
        </Card>
      </aside>
    </section>
  );
}
