"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CheckCheck, ChevronDown, Filter, Loader2, TriangleAlert, XCircle } from "lucide-react";

import { CustomSelect } from "@/components/opportunity/custom-select";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/api";
import type { DubbingTestStatus, DubbingTestSubmission } from "@/types/api";

type SubmissionsManagerProps = {
  organizationSlug: string;
  testId: number;
  initialItems: DubbingTestSubmission[];
  initialPage: number;
  initialLastPage: number;
  reviewDeadlineAt: string;
  initialTestStatus: DubbingTestStatus;
};

export function SubmissionsManager({
  organizationSlug,
  testId,
  initialItems,
  initialPage,
  initialLastPage,
  reviewDeadlineAt,
  initialTestStatus,
}: SubmissionsManagerProps) {
  const [items, setItems] = useState<DubbingTestSubmission[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [lastPage, setLastPage] = useState(initialLastPage);
  const [testStatus, setTestStatus] = useState<DubbingTestStatus>(initialTestStatus);
  const [characterFilter, setCharacterFilter] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "audio" | "video" | "image" | "file">("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingFeedbackId, setSavingFeedbackId] = useState<number | null>(null);
  const [concluding, setConcluding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inlineApprovalError, setInlineApprovalError] = useState<{ submissionId: number; message: string } | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>(
    () =>
      Object.fromEntries(
        initialItems
          .filter((item) => item.rejection_feedback && item.rejection_feedback.trim().length > 0)
          .map((item) => [item.id, item.rejection_feedback ?? ""])
      )
  );

  const hasMore = useMemo(() => page < lastPage, [page, lastPage]);
  const characterOptions = useMemo(() => {
    const characterMap = new Map<number, string>();

    for (const item of items) {
      if (item.character?.id && item.character?.name) {
        characterMap.set(item.character.id, item.character.name);
      }
    }

    return [
      { value: "all", label: "Todos os personagens" },
      ...Array.from(characterMap.entries()).map(([id, name]) => ({
        value: String(id),
        label: name,
      })),
    ];
  }, [items]);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const byCharacter = characterFilter === "all" || String(item.character?.id ?? "") === characterFilter;

      const byMediaType =
        mediaTypeFilter === "all" ||
        Boolean(item.media?.some((media) => media.media_type === mediaTypeFilter));

      return byCharacter && byMediaType;
    });
  }, [characterFilter, items, mediaTypeFilter]);
  const isSelectionConcluded = testStatus === "results_released";

  async function loadMore() {
    if (!hasMore || loadingMore) {
      return;
    }

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/dubbing-tests/${testId}/submissions?page=${nextPage}&per_page=30`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        data?: DubbingTestSubmission[];
        current_page?: number;
        last_page?: number;
      };

      setItems((current) => [...current, ...(payload.data ?? [])]);
      setPage(payload.current_page ?? nextPage);
      setLastPage(payload.last_page ?? lastPage);
    } finally {
      setLoadingMore(false);
    }
  }

  async function reviewSubmission(submissionId: number, status: "approved" | "reserve" | "rejected") {
    if (isSelectionConcluded) {
      return;
    }

    setSavingId(submissionId);
    setFeedback(null);
    setError(null);
    setInlineApprovalError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/dubbing-tests/${testId}/submissions/${submissionId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        submission?: DubbingTestSubmission;
      };

      if (!response.ok) {
        if (status === "approved" && response.status === 422) {
          setInlineApprovalError({
            submissionId,
            message:
              "Não foi possível aprovar esta inscrição porque este personagem já possui um aprovado. Cada personagem aceita somente 1 aprovado.",
          });
        } else {
          setError(payload.message ?? "Não foi possível revisar a inscrição.");
        }
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                ...payload.submission,
                user: payload.submission?.user ?? item.user,
                character: payload.submission?.character ?? item.character,
                reviewer: payload.submission?.reviewer ?? item.reviewer,
              }
            : item
        )
      );

      if (payload.submission?.rejection_feedback !== undefined && payload.submission?.rejection_feedback !== null) {
        setFeedbackDrafts((current) => ({
          ...current,
          [submissionId]: payload.submission?.rejection_feedback ?? "",
        }));
      }

      setFeedback(payload.message ?? "Inscrição revisada com sucesso.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveFeedback(submissionId: number) {
    if (isSelectionConcluded) {
      return;
    }

    const rejectionFeedback = (feedbackDrafts[submissionId] ?? "").trim();
    if (!rejectionFeedback) {
      setError("Digite um feedback antes de salvar.");
      return;
    }

    setSavingFeedbackId(submissionId);
    setFeedback(null);
    setError(null);
    setInlineApprovalError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationSlug}/dubbing-tests/${testId}/submissions/${submissionId}/feedback`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ rejection_feedback: rejectionFeedback }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        submission?: DubbingTestSubmission;
      };

      if (!response.ok) {
        setError(payload.message ?? "Não foi possível salvar o feedback.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                ...payload.submission,
                user: payload.submission?.user ?? item.user,
                character: payload.submission?.character ?? item.character,
                reviewer: payload.submission?.reviewer ?? item.reviewer,
              }
            : item
        )
      );
      setFeedback(payload.message ?? "Feedback salvo com sucesso.");
    } finally {
      setSavingFeedbackId(null);
    }
  }

  async function concludeSelection() {
    if (isSelectionConcluded || concluding) {
      return;
    }

    setConcluding(true);
    setFeedback(null);
    setError(null);
    setInlineApprovalError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationSlug}/dubbing-tests/${testId}/conclude-selection`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Não foi possível concluir a seleção.");
        return;
      }

      setTestStatus("results_released");
      setFeedback(payload.message ?? "Seleção concluída com sucesso.");
      const refreshed = await fetch(
        `/api/organizations/${organizationSlug}/dubbing-tests/${testId}/submissions?page=1&per_page=${Math.max(items.length, 30)}`,
        { cache: "no-store" }
      );
      if (refreshed.ok) {
        const refreshedPayload = (await refreshed.json().catch(() => ({}))) as {
          data?: DubbingTestSubmission[];
          current_page?: number;
          last_page?: number;
        };
        setItems(refreshedPayload.data ?? []);
        setPage(refreshedPayload.current_page ?? 1);
        setLastPage(refreshedPayload.last_page ?? 1);
      }
    } finally {
      setConcluding(false);
    }
  }

  return (
    <div className="space-y-3">
      {feedback ? (
        <p className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} />
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle size={14} />
          {error}
        </p>
      ) : null}

      <p className="inline-flex w-full items-start gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        Os status das inscrições podem ser alterados até {formatDateTime(reviewDeadlineAt)} (encerramento do teste).
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2">
        <p className="text-xs text-black/60">
          Status atual do teste: <strong className="text-[var(--color-ink)]">{labelTestStatus(testStatus)}</strong>
        </p>
        <Button type="button" disabled={isSelectionConcluded || concluding} onClick={concludeSelection}>
          {concluding ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
          {isSelectionConcluded ? "Seleção concluída" : "Concluir seleção"}
        </Button>
      </div>

      <div className="grid gap-2 rounded-[8px] border border-black/10 bg-black/[0.02] p-3 md:grid-cols-2">
        <label className="space-y-1 text-xs text-black/60">
          <span className="inline-flex items-center gap-1">
            <Filter size={12} />
            Filtrar por personagem
          </span>
          <CustomSelect value={characterFilter} onChange={setCharacterFilter} options={characterOptions} />
        </label>

        <label className="space-y-1 text-xs text-black/60">
          <span className="inline-flex items-center gap-1">
            <Filter size={12} />
            Filtrar por material
          </span>
          <CustomSelect
            value={mediaTypeFilter}
            onChange={(value) => setMediaTypeFilter(value as "all" | "audio" | "video" | "image" | "file")}
            options={[
              { value: "all", label: "Todos os materiais" },
              { value: "audio", label: "Áudio" },
              { value: "video", label: "Vídeo" },
              { value: "image", label: "Imagem" },
              { value: "file", label: "Arquivo" },
            ]}
          />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/60">
          Nenhuma inscrição recebida até o momento.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((submission) => {
            const reviewerName = submission.reviewer?.name;
            const statusLabel = labelStatus(submission.status);

            return (
              <article
                key={submission.id}
                className={`space-y-3 rounded-[8px] border border-[var(--color-border-soft)] p-4 ${submissionCardClass(submission.status)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar src={resolveMediaUrl(submission.user?.avatar_path)} name={submission.user?.name ?? "Candidato"} size="sm" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{submission.user?.name ?? "Candidato"}</p>
                      <p className="line-clamp-1 text-xs text-black/55">
                        @{submission.user?.username ?? "sem-usuario"} • {submission.character?.name ?? "Personagem"}
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-[6px] px-2 py-1 text-xs font-semibold ${statusBadgeClass(submission.status)}`}>
                    {statusLabel}
                  </span>
                </div>

                <p className="text-sm text-black/70">{submission.cover_letter ?? "Sem texto."}</p>

                {submission.media && submission.media.length > 0 ? (
                  <details className="overflow-hidden rounded-[8px] border border-black/10 bg-black/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-black/70 [&::-webkit-details-marker]:hidden">
                      <span>Materiais enviados ({submission.media.length})</span>
                      <ChevronDown size={14} className="shrink-0" />
                    </summary>

                    <div className="flex flex-wrap gap-2 border-t border-black/10 p-3">
                      {submission.media.map((media) => (
                        <a
                          key={media.id}
                          href={resolveMediaUrl(media.media_path) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-xs text-[var(--color-ink)]"
                        >
                          {media.media_type.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  </details>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="neutral"
                    className={reviewButtonClass(submission.status === "approved")}
                    disabled={savingId === submission.id || isSelectionConcluded}
                    onClick={() => reviewSubmission(submission.id, "approved")}
                  >
                    {savingId === submission.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    Aprovar
                  </Button>

                  <Button
                    type="button"
                    variant="neutral"
                    className={reviewButtonClass(submission.status === "reserve")}
                    disabled={savingId === submission.id || isSelectionConcluded}
                    onClick={() => reviewSubmission(submission.id, "reserve")}
                  >
                    {savingId === submission.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    Reserva
                  </Button>

                  <Button
                    type="button"
                    variant="neutral"
                    className={reviewButtonClass(submission.status === "rejected")}
                    disabled={savingId === submission.id || isSelectionConcluded}
                    onClick={() => reviewSubmission(submission.id, "rejected")}
                  >
                    {savingId === submission.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    Reprovar
                  </Button>
                </div>

                {reviewerName ? (
                  <p className="text-xs text-black/55">
                    Última revisão por {reviewerName}
                    {submission.reviewed_at ? ` em ${formatDateTime(submission.reviewed_at)}.` : "."}
                  </p>
                ) : null}

                {submission.status === "rejected" ? (
                  <div className="space-y-2 rounded-[8px] border border-red-200 bg-red-50/60 p-3">
                    <label className="block text-xs font-semibold text-red-700">Feedback para reprovação</label>
                    <textarea
                      value={feedbackDrafts[submission.id] ?? ""}
                      onChange={(event) =>
                        setFeedbackDrafts((current) => ({
                          ...current,
                          [submission.id]: event.target.value,
                        }))
                      }
                      disabled={isSelectionConcluded}
                      rows={3}
                      placeholder="Explique ao participante os pontos de melhoria."
                      className="w-full resize-none rounded-[8px] border border-red-200 bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:opacity-70"
                    />
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={savingFeedbackId === submission.id || isSelectionConcluded}
                      onClick={() => saveFeedback(submission.id)}
                      className="border-red-200 bg-white text-red-700 hover:bg-red-100"
                    >
                      {savingFeedbackId === submission.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Salvar feedback
                    </Button>
                  </div>
                ) : null}

                {inlineApprovalError?.submissionId === submission.id ? (
                  <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {inlineApprovalError.message}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <Button type="button" variant="neutral" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
          {loadingMore ? "Carregando..." : "Carregar mais inscrições"}
        </Button>
      ) : null}

      {items.length > 0 && filteredItems.length === 0 ? (
        <p className="rounded-[8px] border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/60">
          Nenhuma inscrição encontrada com os filtros selecionados.
        </p>
      ) : null}
    </div>
  );
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

function reviewButtonClass(isSelected: boolean) {
  return isSelected
    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)]"
    : "border-[var(--color-border-soft)] bg-[var(--color-primary-soft)] text-[var(--color-ink)] hover:bg-[#eadcff]";
}

function labelTestStatus(value: DubbingTestStatus) {
  switch (value) {
    case "draft":
      return "Rascunho";
    case "published":
      return "Publicado";
    case "closed":
      return "Encerrado";
    case "results_released":
      return "Finalizado";
    case "archived":
      return "Arquivado";
    default:
      return value;
  }
}

function submissionCardClass(status: DubbingTestSubmission["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-50/35";
    case "reserve":
      return "bg-amber-50/35";
    case "rejected":
      return "bg-red-50/35";
    default:
      return "bg-white";
  }
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
