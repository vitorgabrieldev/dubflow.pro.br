import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PencilLine } from "lucide-react";

import { DubbingTestForm } from "@/components/opportunity/dubbing-test-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { fetchDubbingTestDetails } from "@/lib/api";
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

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; testId: string }>;
}) {
  const { locale, slug, testId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const parsedTestId = Number(testId);
  if (!Number.isFinite(parsedTestId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const [organizationResponse, opportunity] = await Promise.all([
    fetch(`${apiBase}/organizations/${slug}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
    fetchDubbingTestDetails(parsedTestId, token),
  ]);

  if (!organizationResponse.ok || !opportunity) {
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

  if (opportunity.organization?.slug !== slug) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Editar teste" },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              <PencilLine size={13} />
              Ajustes da oportunidade
            </p>
            <h1 className="text-xl font-semibold text-[var(--color-ink)]">{opportunity.title}</h1>
          </div>

          <DubbingTestForm locale={locale} organizationSlug={organization.slug} mode="edit" initialTest={opportunity} />
        </CardBody>
      </Card>
    </section>
  );
}
