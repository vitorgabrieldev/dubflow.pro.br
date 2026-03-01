"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ImageIcon } from "lucide-react";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  recommended: string;
  currentSrc?: string | null;
  previewClassName: string;
};

export function ImageUploadField({
  name,
  label,
  recommended,
  currentSrc,
  previewClassName,
}: ImageUploadFieldProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(currentSrc ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const hasImage = Boolean(previewSrc);
  const infoText = useMemo(() => `Recomendado: ${recommended}`, [recommended]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setPreviewSrc(nextObjectUrl);
  }

  return (
    <label className="space-y-2 text-sm text-black/75">
      <span className="font-medium">{label}</span>
      <p className="text-xs text-black/50">{infoText}</p>

      <div className={`relative overflow-hidden rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.03] ${previewClassName}`}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc ?? ""} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/45">
            <ImageIcon size={18} />
          </div>
        )}
      </div>

      <input
        type="file"
        name={name}
        accept="image/*"
        onChange={handleChange}
        className="block w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] sm:text-sm file:mr-3 file:cursor-pointer file:whitespace-nowrap file:rounded-[6px] file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
      />
    </label>
  );
}
