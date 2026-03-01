import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { CommunityMembersManager } from "@/components/community/community-members-manager";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { fetchCurrentUser } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type OrganizationDetailsResponse = {
  organization?: {
    id: number;
    name: string;
    slug: string;
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

export default async function InviteMembersPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
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

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

  const [organizationResponse, membersResponse, currentUser] = await Promise.all([
    fetch(`${apiBase}/organizations/${slug}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
    fetch(`${apiBase}/organizations/${slug}/members?per_page=100`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
    fetchCurrentUser(token),
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

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Convidar" },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-3 sm:p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              <UserPlus size={12} />
              Convidar membros
            </p>
            <h1 className="break-words text-lg font-semibold text-[var(--color-ink)] sm:text-2xl">{organization.name}</h1>
          </div>

          <CommunityMembersManager
            locale={locale}
            organizationSlug={organization.slug}
            viewerRole={viewerRole}
            currentUserId={currentUser?.id ?? null}
            initialMembers={members}
          />
        </CardBody>
      </Card>
    </section>
  );
}
