"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, AudioLines, CheckCircle2, File, Loader2, Send, UploadCloud, X, XCircle } from "lucide-react";

import { CustomSelect } from "@/components/opportunity/custom-select";
import { Button } from "@/components/ui/button";
import type { DubbingTestCharacter } from "@/types/api";

type SubmissionFormProps = {
  testId: number;
  characters: DubbingTestCharacter[];
  blockedCharacterIds?: number[];
};

export function SubmissionForm({ testId, characters, blockedCharacterIds = [] }: SubmissionFormProps) {
  const availableCharacters = useMemo(
    () => characters.filter((character) => !blockedCharacterIds.includes(character.id)),
    [blockedCharacterIds, characters]
  );
  const firstAvailableCharacter = availableCharacters[0];
  const [characterId, setCharacterId] = useState<string>(String(firstAvailableCharacter?.id ?? ""));
  const [coverLetter, setCoverLetter] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const mediaPreviews = useMemo(() => {
    return files.map((file) => {
      const kind = getMediaKind(file);
      const previewUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : null;

      return {
        file,
        kind,
        previewUrl,
      };
    });
  }, [files]);

  const canSubmit = useMemo(() => {
    return !pending && Boolean(characterId) && coverLetter.trim().length > 0 && files.length > 0;
  }, [characterId, coverLetter, files.length, pending]);

  useEffect(() => {
    return () => {
      for (const preview of mediaPreviews) {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      }
    };
  }, [mediaPreviews]);

  function appendFiles(list: FileList | File[] | null) {
    if (!list) {
      return;
    }

    const incoming = Array.from(list).filter((file) => getMediaKind(file) !== "other");
    if (incoming.length === 0) {
      return;
    }

    setFiles((current) => {
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
      const payload = new FormData();
      payload.set("character_id", characterId);
      payload.set("cover_letter", coverLetter.trim());

      for (const file of files) {
        payload.append("media_files[]", file);
      }

      const response = await fetch(`/api/dubbing-tests/${testId}/submissions`, {
        method: "POST",
        body: payload,
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(result.message ?? "Não foi possível enviar sua inscrição.");
        return;
      }

      setSuccess(result.message ?? "Inscrição enviada com sucesso.");
      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <label className="space-y-2 text-sm text-black/75">
        <span>Personagem</span>
        <CustomSelect
          value={characterId}
          onChange={(nextValue) => setCharacterId(nextValue)}
          options={availableCharacters.map((character) => ({
            value: String(character.id),
            label: `${character.name} • ${labelAppearance(character.appearance_estimate)}`,
          }))}
        />
      </label>

      <label className="space-y-2 text-sm text-black/75">
        <span>Texto da inscrição</span>
        <textarea
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
          rows={5}
          required
          placeholder="Fale sobre sua experiência, timbre e proposta para o personagem."
          className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
        />
      </label>

      <div className="mt-2 space-y-4 rounded-[12px] border border-sky-200 bg-sky-50/80 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-sky-900">Mídias da inscrição</p>
          <p className="text-xs text-sky-800/80">
            Envie seus materiais de voz para avaliação.
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
              appendFiles(event.target.files);
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
              appendFiles(event.dataTransfer.files);
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

        {mediaPreviews.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mediaPreviews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${preview.file.size}-${index}`}
                className="relative overflow-hidden rounded-[8px] border border-black/10 bg-white p-2"
              >
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="inline-flex max-w-[700px] items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Atenção: a inscrição não pode ser editada depois do envio e você só pode enviar uma vez por personagem.
        </p>

        <Button type="submit" disabled={!canSubmit}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {pending ? "Enviando inscrição..." : "Enviar inscrição"}
        </Button>
      </div>
    </form>
  );
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
