import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Activity, Building2, Eye, Heart, MessageCircle, RadioTower } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardBody } from "@/components/ui/card";
import { fetchDashboardOverview } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function DashboardPage({
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

  const overview = await fetchDashboardOverview(token);

  if (!overview) {
    return (
      <Card>
        <CardBody className="p-4 text-sm text-black/65">Não foi possível carregar o painel agora.</CardBody>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<RadioTower size={16} />} label="Posts" value={overview.summary.total_posts} />
        <MetricCard icon={<Eye size={16} />} label="Views" value={overview.summary.total_views} />
        <MetricCard icon={<Heart size={16} />} label="Likes" value={overview.summary.total_likes} />
        <MetricCard icon={<MessageCircle size={16} />} label="Comentarios" value={overview.summary.total_comments} />
        <MetricCard icon={<Activity size={16} />} label="Convites pendentes" value={overview.summary.pending_collaboration_invites} />
      </div>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Building2 size={15} />
            Minhas comunidades
          </p>

          {overview.organizations.length === 0 ? (
            <p className="text-sm text-black/65">Você ainda não participa de comunidades.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {overview.organizations.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/${locale}/organizations/${organization.slug}`}
                  className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm text-black/75"
                >
                  <p className="line-clamp-1 font-semibold text-[var(--color-ink)]">{organization.name}</p>
                  <p className="text-xs text-black/55">
                    {organization.posts_count ?? 0} posts • {organization.playlists_count ?? 0} playlists
                  </p>
                </Link>
              ))}
            </div>
          )}

          <Link
            href={`/${locale}/minhas-organizacoes`}
            className="inline-flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
          >
            Abrir tela de comunidades
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Top posts</p>
          {overview.top_posts.length === 0 ? (
            <p className="text-sm text-black/65">Sem dados de performance ainda.</p>
          ) : (
            <div className="space-y-2">
              {overview.top_posts.map((post) => (
                <div key={post.id} className="rounded-[8px] border border-black/10 bg-white px-3 py-2">
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{post.title}</p>
                  <p className="text-xs text-black/60">
                    {post.organization?.name ?? "-"} • {post.views_count} views • {post.likes_count} likes
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardBody className="space-y-1 p-4">
        <p className="inline-flex items-center gap-1 text-xs text-black/60">
          {icon}
          {label}
        </p>
        <p className="text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
      </CardBody>
    </Card>
  );
}
