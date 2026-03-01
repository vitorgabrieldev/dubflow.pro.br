import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarClock, Layers3, UsersRound } from "lucide-react";

import { BriefingMediaCarousel } from "@/components/opportunity/briefing-media-carousel";
import { SubmissionForm } from "@/components/opportunity/submission-form";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardBody } from "@/components/ui/card";
import { resolveMediaUrl, fetchDubbingTestDetails, fetchMyDubbingTestSubmissions } from "@/lib/api";
import { isLocale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import type { DubbingTestStatus, DubbingTestSubmission } from "@/types/api";

type OrganizationDetailsResponse = {
  viewer?: {
    role: "owner" | "admin" | "editor" | "member" | null;
  };
};
type OrganizationViewerRole = NonNullable<OrganizationDetailsResponse["viewer"]>["role"];

export default async function OpportunityDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; testId: string }>;
}) {
  const { locale, testId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const parsedId = Number(testId);
  if (!Number.isFinite(parsedId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  const isAuthenticated = Boolean(token);

  const opportunity = await fetchDubbingTestDetails(parsedId, token);
  if (!opportunity) {
    notFound();
  }

  const mySubmissions = isAuthenticated ? await fetchMyDubbingTestSubmissions(parsedId, token) : [];
  const submittedCharacterIds = new Set(mySubmissions.map((submission) => submission.character_id));
  const hasAvailableCharacterToSubmit =
    (opportunity.characters ?? []).some((character) => !submittedCharacterIds.has(character.id));

  const now = new Date();
  const startsAt = new Date(opportunity.starts_at);
  const endsAt = new Date(opportunity.ends_at);
  const canSubmit =
    isAuthenticated &&
    opportunity.status === "published" &&
    !Number.isNaN(startsAt.getTime()) &&
    !Number.isNaN(endsAt.getTime()) &&
    now >= startsAt &&
    now <= endsAt;
  const submissionBlockedReason = resolveSubmissionBlockedReason(opportunity.status, startsAt, endsAt, now);

  const organizationSlug = opportunity.organization?.slug;
  let viewerRole: OrganizationViewerRole = null;

  if (organizationSlug && token) {
    const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";
    const organizationResponse = await fetch(`${apiBase}/organizations/${organizationSlug}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (organizationResponse.ok) {
      const organizationPayload = (await organizationResponse.json()) as OrganizationDetailsResponse;
      viewerRole = organizationPayload.viewer?.role ?? null;
    }
  }

  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const opportunityUrl = `${getSiteUrl()}/${locale}/oportunidades/${opportunity.id}`;
  const opportunitySchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: opportunity.title,
    description: opportunity.description ?? undefined,
    url: opportunityUrl,
    datePublished: opportunity.created_at ?? undefined,
    dateModified: opportunity.created_at ?? undefined,
    creator: opportunity.organization?.name
      ? {
          "@type": "Organization",
          name: opportunity.organization.name,
        }
      : undefined,
    about: "Teste de dublagem",
  };

  return (
    <section className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(opportunitySchema),
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Feed", href: `/${locale}` },
          { label: "Oportunidades", href: `/${locale}/oportunidades` },
          { label: opportunity.title },
        ]}
      />

      <Card>
        <CardBody className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--color-ink)]">{opportunity.title}</h1>
                <span
                  className={`rounded-[6px] px-2 py-0.5 text-xs font-semibold ${
                    opportunity.visibility === "internal"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {opportunity.visibility === "internal" ? "Interno" : "Externo"}
                </span>
                <span className={`rounded-[6px] px-2 py-0.5 text-xs font-semibold ${opportunityStatusBadgeClass(opportunity.status)}`}>
                  {labelOpportunityStatus(opportunity.status)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-black/65">
                <Avatar
                  src={resolveMediaUrl(opportunity.organization?.avatar_path) ?? "/default-org-avatar.svg"}
                  name={opportunity.organization?.name ?? "Comunidade"}
                  size="sm"
                />
                <span>
                  {opportunity.organization?.name ?? "Comunidade"} • @{opportunity.organization?.slug ?? "-"}
                </span>
              </div>
            </div>

            {canManage && organizationSlug ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/organizations/${organizationSlug}/oportunidades/${opportunity.id}/editar`}
                  className="inline-flex h-10 items-center rounded-[8px] border border-black/15 px-4 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Editar teste
                </Link>
                <Link
                  href={`/${locale}/organizations/${organizationSlug}/oportunidades/${opportunity.id}/inscricoes`}
                  className="inline-flex h-10 items-center rounded-[8px] border border-black/15 px-4 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Revisar inscrições
                </Link>
              </div>
            ) : null}
          </div>

          <p className="text-sm text-black/70">{opportunity.description ?? "Sem descrição."}</p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-black/70">
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <CalendarClock size={12} />
              Início: {formatDateTime(opportunity.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <CalendarClock size={12} />
              Encerramento: {formatDateTime(opportunity.ends_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              Resultado: {formatDateTime(opportunity.results_release_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <Layers3 size={12} />
              {(opportunity.characters_count ?? opportunity.characters?.length ?? 0)} personagens
            </span>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-black/5 px-2 py-1">
              <UsersRound size={12} />
              {opportunity.submissions_count ?? 0} inscrições
            </span>
          </div>
        </CardBody>
      </Card>

      {opportunity.media && opportunity.media.length > 0 ? (
        <Card>
          <CardBody className="space-y-3 p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Mídias de briefing</p>
            <BriefingMediaCarousel media={opportunity.media} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Personagens disponíveis</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {(opportunity.characters ?? []).map((character) => (
              <article key={character.id} className="space-y-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{character.name}</p>
                <p className="text-xs text-black/60">Aparição: {labelAppearance(character.appearance_estimate)}</p>
                <p className="text-sm text-black/70">{character.description ?? "Sem descrição."}</p>
                <p className="text-xs text-black/65">Direção espera: {character.expectations ?? "Não informado."}</p>
              </article>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Inscreva-se no teste</p>

          {!isAuthenticated ? (
            <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Você precisa ter uma conta para fazer inscrição para um papel.{" "}
              <Link href={`/${locale}/entrar`} className="font-semibold underline">
                Entrar
              </Link>
            </p>
          ) : canSubmit ? (
            hasAvailableCharacterToSubmit ? (
              <SubmissionForm
                testId={opportunity.id}
                characters={opportunity.characters ?? []}
                blockedCharacterIds={Array.from(submittedCharacterIds)}
              />
            ) : (
              <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/65">
                Você já enviou inscrição para todos os personagens deste teste.
              </p>
            )
          ) : (
            <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/65">
              {submissionBlockedReason}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Minhas inscrições neste teste</p>

          {!isAuthenticated ? (
            <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/65">
              Entre na sua conta para acompanhar suas inscrições.
            </p>
          ) : mySubmissions.length === 0 ? (
            <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/65">
              Você ainda não enviou inscrição para este teste.
            </p>
          ) : (
            <div className="space-y-2">
              {mySubmissions.map((submission) => (
                <article key={submission.id} className="space-y-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{submission.character?.name ?? "Personagem"}</p>
                    <span className={`rounded-[6px] px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(submission.effective_status ?? submission.status)}`}>
                      {labelStatus(submission.effective_status ?? submission.status)}
                    </span>
                  </div>
                  <p className="text-sm text-black/70">{submission.cover_letter ?? "Sem texto."}</p>

                  {submission.media && submission.media.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {submission.media.map((media) => (
                        <a
                          key={media.id}
                          href={resolveMediaUrl(media.media_path) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[6px] border border-black/10 px-2 py-1 text-xs text-[var(--color-ink)]"
                        >
                          {media.media_type.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {(submission.effective_status ?? submission.status) === "submitted" ? (
                    <p className="text-xs text-black/55">
                      Resultado ainda não liberado. Data prevista: {formatDateTime(opportunity.results_release_at)}.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelAppearance(value?: string) {
  switch (value) {
    case "protagonista":
      return "Protagonista";
    case "coadjuvante":
      return "Coadjuvante";
    case "pontas":
      return "Pontas";
    case "figurante":
      return "Figurante";
    case "voz_adicional":
      return "Voz adicional";
    default:
      return "-";
  }
}

function labelStatus(value: DubbingTestSubmission["status"]) {
  switch (value) {
    case "approved":
      return "Aprovado";
    case "reserve":
      return "Reserva";
    case "rejected":
      return "Reprovado";
    default:
      return "Enviado";
  }
}

function statusBadgeClass(value: DubbingTestSubmission["status"]) {
  switch (value) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "reserve":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function labelOpportunityStatus(value: DubbingTestStatus) {
  switch (value) {
    case "draft":
      return "Rascunho";
    case "published":
      return "Publicado";
    case "closed":
      return "Encerrado";
    case "results_released":
      return "Resultados liberados";
    case "archived":
      return "Arquivado";
    default:
      return value;
  }
}

function opportunityStatusBadgeClass(value: DubbingTestStatus) {
  switch (value) {
    case "draft":
      return "bg-gray-100 text-gray-700";
    case "published":
      return "bg-emerald-100 text-emerald-700";
    case "closed":
      return "bg-amber-100 text-amber-700";
    case "results_released":
      return "bg-blue-100 text-blue-700";
    case "archived":
      return "bg-zinc-100 text-zinc-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function resolveSubmissionBlockedReason(
  status: DubbingTestStatus,
  startsAt: Date,
  endsAt: Date,
  now: Date
) {
  if (status !== "published") {
    return "Este teste ainda não foi publicado. Só é possível enviar inscrição quando o status estiver em Publicado.";
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "As datas desse teste estão inválidas. Peça para a comunidade revisar o cronograma.";
  }

  if (now < startsAt) {
    return `As inscrições ainda não começaram. Início em ${formatDateTime(startsAt.toISOString())}.`;
  }

  if (now > endsAt) {
    return `As inscrições foram encerradas em ${formatDateTime(endsAt.toISOString())}.`;
  }

  return "Este teste não está aceitando inscrições no momento.";
}
