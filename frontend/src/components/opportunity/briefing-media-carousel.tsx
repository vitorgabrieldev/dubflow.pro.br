"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";

import { resolveMediaUrl } from "@/lib/api";
import type { DubbingTestMedia } from "@/types/api";

type BriefingMediaCarouselProps = {
  media: DubbingTestMedia[];
};

export function BriefingMediaCarousel({ media }: BriefingMediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fancyboxIndex, setFancyboxIndex] = useState<number | null>(null);
  const canUsePortal = typeof window !== "undefined";

  const imageIndices = useMemo(
    () => media.map((item, index) => ({ item, index })).filter(({ item }) => item.media_type === "image").map(({ index }) => index),
    [media]
  );

  const imageModalPosition = useMemo(() => {
    if (fancyboxIndex === null) {
      return -1;
    }

    return imageIndices.findIndex((index) => index === fancyboxIndex);
  }, [fancyboxIndex, imageIndices]);

  function nextSlide() {
    setActiveIndex((current) => (current + 1) % media.length);
  }

  function previousSlide() {
    setActiveIndex((current) => (current - 1 + media.length) % media.length);
  }

  const nextImageInModal = useCallback(() => {
    if (imageModalPosition < 0 || imageIndices.length <= 1) {
      return;
    }

    const nextPosition = (imageModalPosition + 1) % imageIndices.length;
    setFancyboxIndex(imageIndices[nextPosition]);
  }, [imageIndices, imageModalPosition]);

  const previousImageInModal = useCallback(() => {
    if (imageModalPosition < 0 || imageIndices.length <= 1) {
      return;
    }

    const nextPosition = (imageModalPosition - 1 + imageIndices.length) % imageIndices.length;
    setFancyboxIndex(imageIndices[nextPosition]);
  }, [imageIndices, imageModalPosition]);

  useEffect(() => {
    if (fancyboxIndex === null) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFancyboxIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        nextImageInModal();
      }

      if (event.key === "ArrowLeft") {
        previousImageInModal();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [fancyboxIndex, nextImageInModal, previousImageInModal]);

  useEffect(() => {
    if (!canUsePortal) {
      return;
    }

    if (fancyboxIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [canUsePortal, fancyboxIndex]);

  const activeMedia = media[activeIndex];
  const activeMediaUrl = resolveMediaUrl(activeMedia?.media_path) ?? "";
  const modalMediaUrl =
    fancyboxIndex !== null ? resolveMediaUrl(media[fancyboxIndex]?.media_path) ?? "" : "";

  return (
    <>
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-black/[0.03] p-2">
          <div className="min-h-[240px] w-full overflow-hidden rounded-[8px] bg-black/5">
            {activeMedia.media_type === "image" ? (
              <button
                type="button"
                onClick={() => setFancyboxIndex(activeIndex)}
                className="group relative block h-[240px] w-full cursor-zoom-in"
              >
                <Image
                  src={activeMediaUrl}
                  alt={`Mídia de briefing ${activeIndex + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  <Expand size={12} />
                  Ampliar
                </span>
              </button>
            ) : null}

            {activeMedia.media_type === "video" ? (
              <video src={activeMediaUrl} controls className="h-[240px] w-full object-cover" />
            ) : null}

            {activeMedia.media_type === "audio" ? (
              <div className="flex h-[240px] flex-col items-center justify-center gap-3 px-4">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Áudio de briefing</p>
                <audio src={activeMediaUrl} controls className="w-full max-w-lg" />
              </div>
            ) : null}

            {activeMedia.media_type === "file" ? (
              <div className="flex h-[240px] items-center justify-center">
                <a
                  href={activeMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Abrir arquivo
                </a>
              </div>
            ) : null}
          </div>

          {media.length > 1 ? (
            <>
              <button
                type="button"
                onClick={previousSlide}
                className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Mídia anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Próxima mídia"
              >
                <ChevronRight size={16} />
              </button>
            </>
          ) : null}
        </div>

        {media.length > 1 ? (
          <div className="flex items-center justify-center gap-1.5">
            {media.map((item, index) => {
              const isActive = activeIndex === index;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition ${
                    isActive ? "w-6 bg-[var(--color-primary)]" : "w-2.5 bg-black/20 hover:bg-black/40"
                  }`}
                  aria-label={`Ir para mídia ${index + 1}`}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {canUsePortal && fancyboxIndex !== null
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/78 p-3 backdrop-blur-md sm:p-6"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={() => setFancyboxIndex(null)}
                className="absolute right-3 top-3 cursor-pointer rounded-[8px] border border-white/30 bg-black/45 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-black/65"
              >
                Fechar
              </button>

              {imageIndices.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={previousImageInModal}
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-black/40 text-white transition hover:bg-black/65"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImageInModal}
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-black/40 text-white transition hover:bg-black/65"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : null}

              <div className="relative h-[88vh] w-full max-w-6xl">
                <Image
                  src={modalMediaUrl}
                  alt="Preview ampliado"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
