"use client";

import { useState } from "react";
import { Shield, X } from "lucide-react";

export function LegalInline() {
  const [open, setOpen] = useState<"privacy" | "terms" | null>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen("terms")} className="cursor-pointer font-semibold text-[var(--color-primary)]">
        Termos de Uso
      </button>{" "}
      e{" "}
      <button type="button" onClick={() => setOpen("privacy")} className="cursor-pointer font-semibold text-[var(--color-primary)]">
        Política de Privacidade
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-[8px] border border-black/10 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                <Shield size={16} />
                {open === "privacy" ? "Política de Privacidade" : "Termos de Uso"}
              </p>
              <button
                type="button"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-black/5 text-black/65"
                onClick={() => setOpen(null)}
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-sm leading-6 text-black/70">
              {open === "privacy"
                ? "Coletamos apenas os dados necessários para login, interações e exibição do seu portfólio. Você controla sua exposição pública e pode editar suas informações de perfil a qualquer momento."
                : "Ao usar a plataforma, você concorda em publicar apenas conteúdo com direito de uso e manter os créditos corretos de dublagem. Conteúdos podem ser moderados conforme as regras da comunidade."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
