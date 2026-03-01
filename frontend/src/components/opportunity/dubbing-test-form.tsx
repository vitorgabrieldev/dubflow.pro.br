"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import { AudioLines, CheckCircle2, File, Loader2, PlusCircle, Save, Trash2, UploadCloud, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/opportunity/custom-select";
import type { DubbingTest, DubbingTestAppearanceEstimate } from "@/types/api";

type CharacterDraft = {
  name: string;
  description: string;
  expectations: string;
  appearance_estimate: DubbingTestAppearanceEstimate;
};

type DubbingTestFormProps = {
  locale: string;
  organizationSlug: string;
  mode: "create" | "edit";
  initialTest?: DubbingTest;
};

type EnrollmentDuration =
  | "1_day"
  | "1_week"
  | "2_weeks"
  | "3_weeks"
  | "1_month"
  | "2_months"
  | "3_months"
  | "custom";

export function DubbingTestForm({
  locale,
  organizationSlug,
  mode,
  initialTest,
}: DubbingTestFormProps) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const isCharacterEditingLocked = isEditMode && (initialTest?.submissions_count ?? 0) > 0;

  const [title, setTitle] = useState(initialTest?.title ?? "");
  const [description, setDescription] = useState(initialTest?.description ?? "");
  const [visibility, setVisibility] = useState<"internal" | "external">(initialTest?.visibility ?? "external");
  const [status, setStatus] = useState<DubbingTest["status"]>(initialTest?.status ?? "published");
  const [startsAt, setStartsAt] = useState<Date | null>(toDateOrNull(initialTest?.starts_at));
  const [endsAt, setEndsAt] = useState<Date | null>(toDateOrNull(initialTest?.ends_at));
  const [enrollmentDuration, setEnrollmentDuration] = useState<EnrollmentDuration>(() =>
    inferEnrollmentDuration(initialTest?.starts_at, initialTest?.ends_at)
  );
  const [resultsReleaseAt, setResultsReleaseAt] = useState<Date | null>(toDateOrNull(initialTest?.results_release_at));
  const existingMedia = useMemo(() => initialTest?.media ?? [], [initialTest?.media]);
  const [characters, setCharacters] = useState<CharacterDraft[]>(() => {
    const mapped = initialTest?.characters?.map((character) => ({
      name: character.name,
      description: character.description ?? "",
      expectations: character.expectations ?? "",
      appearance_estimate: character.appearance_estimate,
    }));

    return mapped && mapped.length > 0
      ? mapped
      : [
          {
            name: "",
            description: "",
            expectations: "",
            appearance_estimate: "coadjuvante",
          },
        ];
  });

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [removedExistingMediaIds, setRemovedExistingMediaIds] = useState<number[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const mediaPreviews = useMemo(() => {
    return mediaFiles.map((file) => {
      const kind = getMediaKind(file);
      const previewUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : null;

      return {
        file,
        kind,
        previewUrl,
      };
    });
  }, [mediaFiles]);
  const visibleExistingMedia = useMemo(
    () => existingMedia.filter((media) => !removedExistingMediaIds.includes(media.id)),
    [existingMedia, removedExistingMediaIds]
  );

  const canSubmit = useMemo(() => {
    if (pending) {
      return false;
    }

    if (!title.trim() || !startsAt || !endsAt || !resultsReleaseAt) {
      return false;
    }

    const validCharacters = characters.filter((character) => character.name.trim().length > 0);
    return validCharacters.length > 0;
  }, [characters, endsAt, pending, resultsReleaseAt, startsAt, title]);

  useEffect(() => {
    return () => {
      for (const preview of mediaPreviews) {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      }
    };
  }, [mediaPreviews]);

  function addCharacter() {
    if (isCharacterEditingLocked) {
      return;
    }

    setCharacters((current) => [
      ...current,
      {
        name: "",
        description: "",
        expectations: "",
        appearance_estimate: "coadjuvante",
      },
    ]);
  }

  function removeCharacter(index: number) {
    if (isCharacterEditingLocked) {
      return;
    }

    setCharacters((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updateCharacter(index: number, next: Partial<CharacterDraft>) {
    if (isCharacterEditingLocked) {
      return;
    }

    setCharacters((current) =>
      current.map((character, itemIndex) =>
        itemIndex === index
          ? {
              ...character,
              ...next,
            }
          : character
      )
    );
  }

  function appendMediaFiles(list: FileList | File[] | null) {
    if (!list) {
      return;
    }

    const incoming = Array.from(list).filter((file) => getMediaKind(file) !== "other");
    if (incoming.length === 0) {
      return;
    }

    setMediaFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const merged = [...current];

      for (const file of incoming) {
        const signature = `${file.name}-${file.size}-${file.lastModified}`;
        if (!seen.has(signature)) {
          merged.push(file);
          seen.add(signature);
        }
      }

      return merged;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      if (!startsAt || !endsAt || !resultsReleaseAt) {
        setError("Preencha todas as datas do cronograma.");
        return;
      }

      const payload = new FormData();
      payload.set("title", title.trim());
      payload.set("description", description.trim());
      payload.set("visibility", visibility);
      payload.set("starts_at", startsAt.toISOString());
      payload.set("ends_at", endsAt.toISOString());
      payload.set("results_release_at", resultsReleaseAt.toISOString());

      payload.set("status", status);

      if (!isCharacterEditingLocked) {
        const normalizedCharacters = characters
          .filter((character) => character.name.trim().length > 0)
          .map((character) => ({
            name: character.name.trim(),
            description: character.description.trim(),
            expectations: character.expectations.trim(),
            appearance_estimate: character.appearance_estimate,
          }));

        payload.set("characters_json", JSON.stringify(normalizedCharacters));
      }

      for (const file of mediaFiles) {
        payload.append("media_files[]", file);
      }

      for (const mediaId of removedExistingMediaIds) {
        payload.append("remove_media_ids[]", String(mediaId));
      }

      const endpoint = isEditMode
        ? `/api/organizations/${organizationSlug}/dubbing-tests/${initialTest?.id}/update`
        : `/api/organizations/${organizationSlug}/dubbing-tests/create`;
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: payload,
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        dubbing_test?: { id?: number };
      };

      if (!response.ok) {
        setError(result.message ?? "Não foi possível salvar o teste de dublagem.");
        return;
      }

      setSuccess(result.message ?? "Teste salvo com sucesso.");

      const nextId = result.dubbing_test?.id ?? initialTest?.id;
      if (nextId) {
        router.push(`/${locale}/oportunidades/${nextId}`);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {success ? (
        <p className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} />
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle size={14} />
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-black/75 sm:col-span-2">
          <span className="inline-flex items-center gap-1.5">Título do teste</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label className="space-y-2 text-sm text-black/75 sm:col-span-2">
          <span className="inline-flex items-center gap-1.5">Descrição</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Descreva o projeto, direção de voz e contexto do teste."
            className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
          />
        </label>

        <label className="space-y-2 text-sm text-black/75">
          <span className="inline-flex items-center gap-1.5">Tipo do teste</span>
          <CustomSelect
            value={visibility}
            onChange={(nextValue) => setVisibility(nextValue as "internal" | "external")}
            options={[
              { value: "external", label: "Externo", hint: "Todos os usuários podem visualizar." },
              { value: "internal", label: "Interno", hint: "Somente membros da comunidade." },
            ]}
          />
        </label>

        <label className="space-y-2 text-sm text-black/75">
          <span className="inline-flex items-center gap-1.5">
            Status
            <InfoTooltip message="Rascunho: oculto e sem inscrições. Publicado: visível e aceita inscrições no período. Encerrado: bloqueia novos envios. Arquivado: histórico, sem operação." />
          </span>
          <CustomSelect
            value={status}
            onChange={(nextValue) => setStatus(nextValue as DubbingTest["status"])}
            options={[
              { value: "draft", label: "Rascunho", hint: "Ainda não aparece para candidatos." },
              { value: "published", label: "Publicado", hint: "Fica visível e aceita inscrições no período." },
              { value: "closed", label: "Encerrado", hint: "Bloqueia novos envios." },
              { value: "archived", label: "Arquivado", hint: "Mantém só como histórico." },
            ]}
          />
        </label>

        <div className="space-y-4 rounded-[12px] border border-amber-200 bg-amber-50/80 p-4 sm:col-span-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900">Cronograma do teste</p>
            <p className="text-xs text-amber-800/80">
              Essas datas controlam quando inscrições começam, terminam e quando os resultados ficam visíveis.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="flex w-full flex-col space-y-2 text-sm text-black/75 md:max-w-[50%]">
              <span className="block">Início dos testes</span>
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs text-black/55">
                Defina quando os envios serão liberados.
                <InfoTooltip message="Momento em que candidatos podem começar a enviar material para os personagens." />
              </span>
              <DatePicker
                selected={startsAt}
                onChange={(date: Date | null) => {
                  setStartsAt(date);

                  if (!date) {
                    setEndsAt(null);
                    return;
                  }

                  if (enrollmentDuration !== "custom") {
                    setEndsAt(computeEndDate(date, enrollmentDuration));
                  }
                }}
                showTimeSelect
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                locale={ptBR}
                placeholderText="Selecione data e horário"
                className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm"
                popperClassName="dubbing-datepicker-popper"
                calendarClassName="dubbing-datepicker"
              />
            </label>

            <label className="flex w-full flex-col space-y-2 text-sm text-black/75 md:max-w-[50%]">
              <span className="block">Duração das inscrições</span>
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs text-black/55">
                Escolha um período rápido ou use data personalizada.
                <InfoTooltip message="A duração calcula automaticamente o fim das inscrições a partir da data de início." />
              </span>
              <CustomSelect
                value={enrollmentDuration}
                onChange={(nextValue) => {
                  const nextDuration = nextValue as EnrollmentDuration;
                  setEnrollmentDuration(nextDuration);

                  if (nextDuration === "custom") {
                    return;
                  }

                  if (!startsAt) {
                    setEndsAt(null);
                    return;
                  }

                  setEndsAt(computeEndDate(startsAt, nextDuration));
                }}
                options={[
                  { value: "1_day", label: "1 dia" },
                  { value: "1_week", label: "1 semana" },
                  { value: "2_weeks", label: "2 semanas" },
                  { value: "3_weeks", label: "3 semanas" },
                  { value: "1_month", label: "1 mês" },
                  { value: "2_months", label: "2 meses" },
                  { value: "3_months", label: "3 meses" },
                  { value: "custom", label: "Data personalizada" },
                ]}
              />
            </label>

            {enrollmentDuration === "custom" ? (
              <label className="flex w-full flex-col space-y-2 text-sm text-black/75 md:max-w-[50%]">
                <span className="block">Fim das inscrições</span>
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs text-black/55">
                  Defina manualmente o prazo final.
                  <InfoTooltip message="Prazo final para envio. Após esse horário, novos envios ficam bloqueados." />
                </span>
                <DatePicker
                  selected={endsAt}
                  onChange={(date: Date | null) => setEndsAt(date)}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="dd/MM/yyyy HH:mm"
                  locale={ptBR}
                  placeholderText="Selecione data e horário"
                  className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm"
                  popperClassName="dubbing-datepicker-popper"
                  calendarClassName="dubbing-datepicker"
                />
              </label>
            ) : null}

            <label className="flex w-full flex-col space-y-2 text-sm text-black/75 md:max-w-[50%]">
              <span className="block">Liberação dos resultados</span>
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs text-black/55">
                Data em que o resultado fica visível para candidatos.
                <InfoTooltip message="Data em que aprovados e reservas recebem notificação e conseguem ver o resultado." />
              </span>
              <DatePicker
                selected={resultsReleaseAt}
                onChange={(date: Date | null) => setResultsReleaseAt(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                locale={ptBR}
                placeholderText="Selecione data e horário"
                className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm"
                popperClassName="dubbing-datepicker-popper"
                calendarClassName="dubbing-datepicker"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-[12px] border border-sky-200 bg-sky-50/80 p-4 sm:col-span-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-sky-900">Mídias de briefing</p>
            <p className="text-xs text-sky-800/80">
              Adicione referências para orientar os candidatos no teste.
            </p>
          </div>

          <label className="space-y-2 text-sm text-black/75">
            <span className="block">Arquivos de mídia</span>
            <span className="block text-xs text-black/55">
              Aceitos: imagens (`.jpg`, `.jpeg`, `.png`, `.webp`), vídeos (`.mp4`, `.mov`, `.webm`) e áudios (`.mp3`, `.wav`, `.ogg`, `.m4a`). Máximo: 1GB por arquivo.
            </span>
            <input
              ref={mediaInputRef}
              type="file"
              multiple
              accept="audio/*,video/*,image/*"
              onChange={(event) => {
                appendMediaFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingMedia(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDraggingMedia(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingMedia(false);
                appendMediaFiles(event.dataTransfer.files);
              }}
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed bg-white px-4 py-6 text-center transition ${
                isDraggingMedia
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-border-soft)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/40"
              }`}
            >
              <UploadCloud size={20} className="text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-ink)]">Arraste e solte suas mídias aqui</p>
              <p className="text-xs text-black/55">ou clique para selecionar arquivos do dispositivo</p>
            </button>
          </label>

          {visibleExistingMedia.length > 0 || mediaPreviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visibleExistingMedia.map((media) => (
                <div
                  key={`existing-media-${media.id}`}
                  className="relative overflow-hidden rounded-[8px] border border-black/10 bg-white p-2"
                >
                  <button
                    type="button"
                    onClick={() => setRemovedExistingMediaIds((current) => [...current, media.id])}
                    className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover mídia existente"
                  >
                    <X size={12} />
                  </button>

                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-[6px] bg-black/[0.03]">
                    {media.media_type === "image" ? (
                      <Image
                        src={media.media_path}
                        alt={`Mídia ${media.id}`}
                        width={160}
                        height={80}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : null}

                    {media.media_type === "video" ? (
                      <video src={media.media_path} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : null}

                    {media.media_type === "audio" ? (
                      <AudioLines size={18} className="text-[var(--color-primary)]" />
                    ) : null}

                    {media.media_type === "file" ? <File size={18} className="text-black/45" /> : null}
                  </div>

                  <p className="line-clamp-1 text-[11px] font-semibold text-black/70">Mídia já enviada</p>
                  <p className="text-[10px] text-black/55">{labelMediaType(media.media_type)}</p>
                </div>
              ))}

              {mediaPreviews.map((preview, index) => (
                <div
                  key={`${preview.file.name}-${preview.file.size}-${index}`}
                  className="relative overflow-hidden rounded-[8px] border border-black/10 bg-white p-2"
                >
                  <button
                    type="button"
                    onClick={() => setMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover mídia"
                  >
                    <X size={12} />
                  </button>

                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-[6px] bg-black/[0.03]">
                    {preview.kind === "image" && preview.previewUrl ? (
                      <Image
                        src={preview.previewUrl}
                        alt={preview.file.name}
                        width={160}
                        height={80}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : null}

                    {preview.kind === "video" && preview.previewUrl ? (
                      <video src={preview.previewUrl} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : null}

                    {preview.kind === "audio" ? (
                      <AudioLines size={18} className="text-[var(--color-primary)]" />
                    ) : null}

                    {preview.kind === "other" ? <File size={18} className="text-black/45" /> : null}
                  </div>

                  <p className="line-clamp-1 text-[11px] font-semibold text-black/70">{preview.file.name}</p>
                  <p className="text-[10px] text-black/55">{formatBytes(preview.file.size)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-[10px] border border-[var(--color-border-soft)] bg-black/[0.02] p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Personagens do teste</p>
          <Button type="button" variant="neutral" onClick={addCharacter} disabled={isCharacterEditingLocked}>
            <PlusCircle size={14} />
            Adicionar personagem
          </Button>
        </div>

        {isCharacterEditingLocked ? (
          <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Personagens bloqueados: Este teste já recebeu inscrições. Você ainda pode editar os outros campos normalmente.
          </p>
        ) : null}

        {characters.map((character, index) => (
          <div key={`character-${index}`} className="space-y-4 rounded-[8px] border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Personagem #{index + 1}</p>
              <button
                type="button"
                onClick={() => removeCharacter(index)}
                disabled={isCharacterEditingLocked}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border border-black/10 text-black/65 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Remover personagem"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <label className="space-y-2 text-sm text-black/75">
              <span className="inline-flex items-center gap-1.5">Nome</span>
              <Input
                value={character.name}
                onChange={(event) => updateCharacter(index, { name: event.target.value })}
                placeholder="Nome do personagem"
                disabled={isCharacterEditingLocked}
                required
              />
            </label>

            <label className="space-y-2 text-sm text-black/75">
              <span className="inline-flex items-center gap-1.5">Aparição estimada</span>
              <CustomSelect
                value={character.appearance_estimate}
                onChange={(nextValue) =>
                  updateCharacter(index, {
                    appearance_estimate: nextValue as DubbingTestAppearanceEstimate,
                  })
                }
                disabled={isCharacterEditingLocked}
                options={[
                  { value: "protagonista", label: "Protagonista" },
                  { value: "coadjuvante", label: "Coadjuvante" },
                  { value: "pontas", label: "Pontas" },
                  { value: "figurante", label: "Figurante" },
                  { value: "voz_adicional", label: "Voz adicional" },
                ]}
              />
            </label>

            <label className="space-y-2 text-sm text-black/75">
              <span className="inline-flex items-center gap-1.5">Descrição do personagem</span>
              <textarea
                value={character.description}
                onChange={(event) => updateCharacter(index, { description: event.target.value })}
                rows={2}
                placeholder="Perfil emocional, faixa etária, contexto."
                disabled={isCharacterEditingLocked}
                className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
              />
            </label>

            <label className="space-y-2 text-sm text-black/75">
              <span className="inline-flex items-center gap-1.5">O que a direção espera</span>
              <textarea
                value={character.expectations}
                onChange={(event) => updateCharacter(index, { expectations: event.target.value })}
                rows={2}
                placeholder="Tom, intenção e referência de interpretação."
                disabled={isCharacterEditingLocked}
                className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
              />
            </label>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : isEditMode ? <Save size={14} /> : <PlusCircle size={14} />}
        {pending ? "Salvando teste..." : isEditMode ? "Salvar ajustes" : "Criar teste"}
      </Button>
    </form>
  );
}

function toDateOrNull(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferEnrollmentDuration(startsAt?: string | null, endsAt?: string | null): EnrollmentDuration {
  const startDate = toDateOrNull(startsAt);
  const endDate = toDateOrNull(endsAt);

  if (!startDate || !endDate) {
    return "1_week";
  }

  const minutesDiff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const presets: Array<{ key: EnrollmentDuration; minutes: number }> = [
    { key: "1_day", minutes: 24 * 60 },
    { key: "1_week", minutes: 7 * 24 * 60 },
    { key: "2_weeks", minutes: 14 * 24 * 60 },
    { key: "3_weeks", minutes: 21 * 24 * 60 },
    { key: "1_month", minutes: 30 * 24 * 60 },
    { key: "2_months", minutes: 60 * 24 * 60 },
    { key: "3_months", minutes: 90 * 24 * 60 },
  ];

  const found = presets.find((item) => item.minutes === minutesDiff);
  return found?.key ?? "custom";
}

function computeEndDate(startAt: Date, duration: Exclude<EnrollmentDuration, "custom">) {
  const base = new Date(startAt.getTime());

  switch (duration) {
    case "1_day":
      base.setDate(base.getDate() + 1);
      return base;
    case "1_week":
      base.setDate(base.getDate() + 7);
      return base;
    case "2_weeks":
      base.setDate(base.getDate() + 14);
      return base;
    case "3_weeks":
      base.setDate(base.getDate() + 21);
      return base;
    case "1_month":
      base.setMonth(base.getMonth() + 1);
      return base;
    case "2_months":
      base.setMonth(base.getMonth() + 2);
      return base;
    case "3_months":
      base.setMonth(base.getMonth() + 3);
      return base;
    default:
      return base;
  }
}

function getMediaKind(file: File): "image" | "video" | "audio" | "other" {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "other";
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function labelMediaType(mediaType: "audio" | "video" | "image" | "file") {
  switch (mediaType) {
    case "audio":
      return "Áudio";
    case "video":
      return "Vídeo";
    case "image":
      return "Imagem";
    default:
      return "Arquivo";
  }
}
