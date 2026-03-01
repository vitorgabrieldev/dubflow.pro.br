import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { SubmissionsManager } from "@/components/opportunity/submissions-manager";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { fetchDubbingTestDetails } from "@/lib/api";
import { isLocale } from "@/lib/i18n";
import type { DubbingTestSubmission } from "@/types/api";

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

type SubmissionsPayload = {
  data?: DubbingTestSubmission[];
  current_page?: number;
  last_page?: number;
};

export default async function OpportunitySubmissionsPage({
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

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

  const [organizationResponse, opportunity, submissionsResponse] = await Promise.all([
    fetch(`${apiBase}/organizations/${slug}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
    fetchDubbingTestDetails(parsedTestId, token),
    fetch(`${apiBase}/organizations/${slug}/dubbing-tests/${parsedTestId}/submissions?per_page=30`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }),
  ]);

  if (!organizationResponse.ok || !opportunity || !submissionsResponse.ok) {
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

  const submissionsPayload = (await submissionsResponse.json()) as SubmissionsPayload;

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Comunidades", href: `/${locale}/comunidades` },
          { label: organization.name, href: `/${locale}/organizations/${organization.slug}` },
          { label: "Inscrições" },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              <ClipboardCheck size={13} />
              Revisão de inscrições
            </p>
            <h1 className="text-xl font-semibold text-[var(--color-ink)]">{opportunity.title}</h1>
            <p className="text-sm text-black/60">
              Você pode aprovar, marcar como reserva ou reprovar a qualquer momento. O resultado fica visível para o candidato na data programada.
            </p>
          </div>

          <SubmissionsManager
            organizationSlug={organization.slug}
            testId={opportunity.id}
            initialItems={submissionsPayload.data ?? []}
            initialPage={submissionsPayload.current_page ?? 1}
            initialLastPage={submissionsPayload.last_page ?? 1}
            reviewDeadlineAt={opportunity.ends_at}
            initialTestStatus={opportunity.status}
          />
        </CardBody>
      </Card>
    </section>
  );
}
