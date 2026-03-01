import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Users } from "lucide-react";

import { ImageUploadField } from "@/components/profile/image-upload-field";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type OrganizationDetailsResponse = {
  organization?: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    website_url: string | null;
    avatar_path: string | null;
    cover_path: string | null;
    is_public: boolean;
    followers_count: number;
    posts_count: number;
    playlists_count: number;
  };
  viewer?: {
    role: "owner" | "admin" | "editor" | "member" | null;
  };
};

type MemberListResponse = {
  data?: Array<{
    id: number;
    role: "owner" | "admin" | "editor" | "member";
    status: "active" | "pending" | "rejected";
    user?: {
      id: number;
      name: string;
      username: string | null;
      avatar_path: string | null;
      email?: string | null;
    };
  }>;
};

export default async function EditOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const query = await searchParams;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

  const [organizationResponse, membersResponse] = await Promise.all([
    fetch(`${apiBase}/organizations/${slug}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
    fetch(`${apiBase}/organizations/${slug}/members?per_page=50`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
  ]);

  if (!organizationResponse.ok) {
    notFound();
  }

  const organizationPayload = (await organizationResponse.json()) as OrganizationDetailsResponse;
  const organization = organizationPayload.organization;
  const viewerRole = organizationPayload.viewer?.role ?? null;

  if (!organization) {
    notFound();
  }

  if (viewerRole !== "owner" && viewerRole !== "admin") {
    redirect(`/${locale}/organizations/${slug}`);
  }

  const membersPayload = membersResponse.ok ? ((await membersResponse.json()) as MemberListResponse) : {};
  const members = membersPayload.data ?? [];
  const activeMembers = members.filter((member) => member.status === "active").length;
  const pendingMembers = members.filter((member) => member.status === "pending").length;

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Editar comunidade" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardBody className="space-y-4 p-3 sm:p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Editar comunidade</p>
              <h1 className="break-words text-lg font-semibold leading-tight text-[var(--color-ink)] sm:text-2xl">
                {organization.name}
              </h1>
            </div>

            {query.updated === "1" ? (
              <p className="inline-flex items-center gap-2 rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={14} />
                Comunidade atualizada com sucesso.
              </p>
            ) : null}

            {query.error === "1" ? (
              <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Não foi possível atualizar a comunidade.
              </p>
            ) : null}

            <form action={`/api/organizations/${organization.slug}/update`} method="post" encType="multipart/form-data" className="space-y-4">
              <input type="hidden" name="locale" value={locale} />

              <label className="space-y-1 text-sm text-black/75">
                <span className="font-medium">Nome da comunidade</span>
                <Input name="name" defaultValue={organization.name} placeholder="Preencha o nome da comunidade" required />
              </label>

              <label className="space-y-1 text-sm text-black/75">
                <span className="font-medium">Descrição</span>
                <textarea
                  name="description"
                  defaultValue={organization.description ?? ""}
                  rows={4}
                  placeholder="Preencha a descrição da comunidade"
                  className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </label>

              <label className="space-y-1 text-sm text-black/75">
                <span className="font-medium">Website</span>
                <Input name="website_url" defaultValue={organization.website_url ?? ""} placeholder="Preencha o site da comunidade" />
              </label>

              <hr className="border-black/10" />

              <div className="grid gap-3 sm:grid-cols-2">
                <ImageUploadField
                  name="cover"
                  label="Banner"
                  recommended="1600x600 (8:3)"
                  currentSrc={resolveMediaUrl(organization.cover_path) ?? "/default-org-banner.svg"}
                  previewClassName="aspect-[8/3] w-full"
                />

                <ImageUploadField
                  name="avatar"
                  label="Avatar"
                  recommended="800x800 (1:1)"
                  currentSrc={resolveMediaUrl(organization.avatar_path) ?? "/default-org-avatar.svg"}
                  previewClassName="aspect-square w-24 sm:w-28"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-black/75">
                <input
                  type="checkbox"
                  name="is_public"
                  value="1"
                  defaultChecked={organization.is_public}
                  className="cursor-pointer accent-[var(--color-primary)]"
                />
                <span className="inline-flex items-center gap-1">
                  Comunidade pública
                  <InfoTooltip message="Pública: qualquer pessoa pode entrar e publicar. Privada: precisa ser convidado por um membro." />
                </span>
              </label>

              <FormSubmitButton
                className="w-full"
                label="Salvar comunidade"
                loadingLabel="Salvando comunidade..."
                showPendingOnClick
              />
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <Users size={14} />
                Membros da comunidade
              </p>

              {members.length === 0 ? (
                <p className="text-sm text-black/60">Nenhum membro encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar src={resolveMediaUrl(member.user?.avatar_path)} name={member.user?.name ?? "Membro"} size="sm" />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{member.user?.name ?? "Membro"}</p>
                          <p className="line-clamp-1 text-xs text-black/55">@{member.user?.username ?? "sem-usuario"}</p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-[6px] bg-black/5 px-2 py-1 text-xs text-black/70">
                        {member.role} • {member.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2 p-4 text-sm text-black/70">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <ShieldCheck size={14} />
                Informações rápidas
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">{organization.followers_count}</strong> seguidores
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">{organization.posts_count}</strong> episódios
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">{organization.playlists_count}</strong> playlists
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">{activeMembers}</strong> membros ativos
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">{pendingMembers}</strong> convites pendentes
              </p>

              <Link
                href={`/${locale}/organizations/${organization.slug}`}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 px-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                <ArrowLeft size={14} />
                Voltar para comunidade
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
