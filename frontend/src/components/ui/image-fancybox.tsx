"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type ImageFancyboxProps = {
  src?: string | null;
  alt: string;
  children: ReactNode;
  className?: string;
  showExpandBadge?: boolean;
};

export function ImageFancybox({
  src,
  alt,
  children,
  className,
  showExpandBadge = false,
}: ImageFancyboxProps) {
  const [open, setOpen] = useState(false);
  const canUsePortal = typeof window !== "undefined";

  useEffect(() => {
    if (!canUsePortal || !open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [canUsePortal, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open]);

  if (!src) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group relative block cursor-zoom-in text-left", className)}
        aria-label={`Ampliar imagem: ${alt}`}
      >
        {children}
        {showExpandBadge ? (
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            <Expand size={12} />
            Ampliar
          </span>
        ) : null}
      </button>

      {canUsePortal && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
              role="dialog"
              aria-modal="true"
              onClick={() => setOpen(false)}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/55 text-white transition hover:bg-black/75"
                aria-label="Fechar visualizador"
              >
                <X size={18} />
              </button>

              <div className="relative h-[88vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
                <Image src={src} alt={alt} fill unoptimized className="object-contain" />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
