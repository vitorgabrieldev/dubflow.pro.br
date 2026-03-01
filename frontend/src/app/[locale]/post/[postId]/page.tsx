import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/feed/post-card";
import { PostManagementActions } from "@/components/post/post-management-actions";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveMediaUrl } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import type { Post } from "@/types/api";

type PostDetailResponse = {
  post?: Post;
};

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; postId: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { locale, postId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

  const response = await fetch(`${apiBase}/posts/${postId}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });

  if (response.status === 404 || response.status === 403) {
    notFound();
  }

  if (!response.ok) {
    return <EmptyState />;
  }

  const payload = (await response.json()) as PostDetailResponse;
  const post = payload.post;
  const query = await searchParams;

  if (!post) {
    return <EmptyState />;
  }

  const canEditPost = Boolean(token && post.viewer_permissions?.can_edit);
  const canDeletePost = Boolean(token && post.viewer_permissions?.can_delete);
  const postUrl = `${getSiteUrl()}/${locale}/post/${post.id}`;
  const postImage = resolveMediaUrl(post.thumbnail_path ?? post.media_path) ?? undefined;
  const postSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description ?? undefined,
    image: postImage,
    datePublished: post.published_at ?? undefined,
    dateModified: post.published_at ?? undefined,
    author: post.author?.name
      ? {
          "@type": "Person",
          name: post.author.name,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "DubFlow",
      url: getSiteUrl(),
    },
    mainEntityOfPage: postUrl,
    url: postUrl,
  };

  return (
    <section className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(postSchema),
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Episódio" },
        ]}
      />

      {query.updated === "1" ? (
        <p className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Episódio atualizado com sucesso.
        </p>
      ) : null}

      {canEditPost || canDeletePost ? (
        <PostManagementActions
          locale={locale}
          postId={post.id}
          isAuthenticated={Boolean(token)}
          canEdit={canEditPost}
          canDelete={canDeletePost}
        />
      ) : null}

      <PostCard post={post} locale={locale as Locale} isAuthenticated={Boolean(token)} />
    </section>
  );
}
