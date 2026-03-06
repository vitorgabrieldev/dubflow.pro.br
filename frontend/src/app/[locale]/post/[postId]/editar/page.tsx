import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clapperboard } from "lucide-react";

import { PublishEpisodeForm } from "@/components/publish/publish-episode-form";
import { Card, CardBody } from "@/components/ui/card";
import { fetchPublishOptions } from "@/lib/api";
import { isLocale } from "@/lib/i18n";
import type { Post, PublishOrganizationOption } from "@/types/api";

type PostDetailResponse = {
  post?: Post;
};

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; postId: string }>;
  searchParams: Promise<{ error?: string; error_message?: string }>;
}) {
  const { locale, postId } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const response = await fetch(`${apiBase}/posts/${postId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as PostDetailResponse;
  const post = payload.post;

  if (!post || !post.organization) {
    notFound();
  }
  const organization = post.organization;

  const publishOptions = await fetchPublishOptions(token);
  const canManagePost = Boolean(post.viewer_permissions?.can_edit);

  if (!canManagePost) {
    redirect(`/${locale}/post/${postId}`);
  }

  const selectedOrg = publishOptions.find((candidate) => candidate.slug === organization.slug);
  const fallbackOptions: PublishOrganizationOption[] = [
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      avatar_path: organization.avatar_path,
      is_verified: organization.is_verified,
      playlists: post.playlist
        ? [
            {
              id: post.playlist.id,
              organization_id: organization.id,
              title: post.playlist.title,
              slug: post.playlist.slug,
              description: null,
              work_title: null,
              season_number: null,
              release_year: null,
              visibility: "public",
              seasons: post.season
                ? [
                    {
                      id: post.season.id,
                      playlist_id: post.playlist.id,
                      season_number: post.season.season_number,
                      title: post.season.title ?? null,
                    },
                  ]
                : [],
            },
          ]
        : [],
    },
  ];

  const formOptions = selectedOrg ? [selectedOrg] : fallbackOptions;
  const collaboratorGroupsMap = new Map<string, { role: string; people: { user_id: number | null; label: string }[] }>();

  for (const credit of post.credits ?? []) {
    const role = (credit.character_name ?? "").trim();
    const personLabel = (credit.dubber?.stage_name ?? credit.dubber?.name ?? credit.dubber_name ?? "").trim();
    if (!role || !personLabel) {
      continue;
    }

    const existingGroup = collaboratorGroupsMap.get(role) ?? { role, people: [] };
    existingGroup.people.push({
      user_id: credit.dubber_user_id ?? null,
      label: personLabel,
    });
    collaboratorGroupsMap.set(role, existingGroup);
  }

  const collaboratorGroups = Array.from(collaboratorGroupsMap.values());

  return (
    <section className="space-y-4">
      <Link
        href={`/${locale}/post/${postId}`}
        className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-black/15 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
      >
        <ArrowLeft size={14} />
        Voltar para o episódio
      </Link>

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
              <Clapperboard size={16} />
              Editar episódio
            </p>
            <p className="text-sm text-black/65">Atualize os dados do episódio com o mesmo formulário de publicação.</p>
          </div>

          {query.error === "1" ? (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {query.error_message?.trim() || "Não foi possível atualizar este episódio."}
            </p>
          ) : null}

          <PublishEpisodeForm
            locale={locale}
            options={formOptions}
            mode="edit"
            postId={post.id}
            initialValues={{
              title: post.title,
              description: post.description ?? "",
              work_title: post.metadata?.work_title ?? "",
              language_code: post.language_code,
              organization_slug: organization.slug,
              playlist_id: post.playlist?.id ?? null,
              season_id: post.season?.id ?? null,
              allow_comments: post.allow_comments ?? true,
              show_likes_count: post.metadata?.display_metrics?.show_likes ?? true,
              show_views_count: post.metadata?.display_metrics?.show_views ?? true,
              duration_seconds: post.duration_seconds,
              collaborator_groups: collaboratorGroups,
              publish_target: post.metadata?.publish_target === "profile" ? "profile" : "community",
            }}
          />
        </CardBody>
      </Card>
    </section>
  );
}
