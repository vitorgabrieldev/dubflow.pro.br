import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Building2, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { fetchMyOrganizations, resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function MyOrganizationsPage({
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

  const organizations = await fetchMyOrganizations(token);


  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
            <Building2 size={16} />
            Minhas comunidades
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/nova-organizacao`}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              <PlusCircle size={14} />
              Nova comunidade
            </Link>
            <Link
              href={`/${locale}/publicar`}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--color-primary)] px-3 text-sm font-semibold text-white"
            >
              <Sparkles size={14} />
              Publicar nova dublagem
            </Link>
          </div>
        </CardBody>
      </Card>

      {organizations.length === 0 ? (
        <Card>
          <CardBody className="p-4 text-sm text-black/65">Você ainda não participa de nenhuma comunidade.</CardBody>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => {
            return (
            <Card key={organization.id}>
                <CardBody className="space-y-3 p-4" data-testid={`my-org-card-${organization.slug}`}>
                  <div className="flex items-start gap-3">
                    <Avatar src={resolveMediaUrl(organization.avatar_path)} name={organization.name} size="lg" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{organization.name}</p>
                      <p className="line-clamp-1 text-xs text-black/55">@{organization.slug}</p>
                      {organization.is_verified ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-[6px] bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck size={12} />
                          Verificada
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-center text-[11px] text-black/65">
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{organization.followers_count ?? 0}</strong>
                      <br />
                      seguidores
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{organization.playlists_count ?? 0}</strong>
                      <br />
                      playlists
                    </span>
                    <span className="rounded-[6px] bg-black/5 px-2 py-1">
                      <strong className="text-[var(--color-ink)]">{organization.posts_count ?? 0}</strong>
                      <br />
                      episódios
                    </span>
                  </div>


                  <Link
                    href={`/${locale}/organizations/${organization.slug}`}
                    className="inline-flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    Abrir comunidade
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
