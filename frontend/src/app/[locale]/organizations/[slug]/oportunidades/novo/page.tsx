import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Mic2 } from "lucide-react";

import { DubbingTestForm } from "@/components/opportunity/dubbing-test-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { isLocale } from "@/lib/i18n";

type OrganizationResponse = {
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
  viewer?: {
    role: "owner" | "admin" | "editor" | "member" | null;
  };
};

export default async function CreateOpportunityPage({
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
  const organizationResponse = await fetch(`${apiBase}/organizations/${slug}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!organizationResponse.ok) {
    notFound();
  }

  const organizationPayload = (await organizationResponse.json()) as OrganizationResponse;
  const organization = organizationPayload.organization;
  const viewerRole = organizationPayload.viewer?.role ?? null;

  if (!organization) {
    notFound();
  }

  if (viewerRole !== "owner" && viewerRole !== "admin") {
    redirect(`/${locale}/organizations/${slug}`);
  }

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Novo teste" },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              <Mic2 size={13} />
              Teste de dublagem
            </p>
            <h1 className="text-xl font-semibold text-[var(--color-ink)]">Criar nova oportunidade</h1>
          </div>

          <DubbingTestForm locale={locale} organizationSlug={organization.slug} mode="create" />
        </CardBody>
      </Card>
    </section>
  );
}
