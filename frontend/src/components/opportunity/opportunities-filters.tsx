"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DubbingTestAppearanceEstimate } from "@/types/api";

type OpportunitiesFiltersProps = {
  locale: string;
  initialQuery: string;
  initialVisibility: "all" | "internal" | "external";
  initialAppearance: "all" | DubbingTestAppearanceEstimate;
};

export function OpportunitiesFilters({
  locale,
  initialQuery,
  initialVisibility,
  initialAppearance,
}: OpportunitiesFiltersProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [visibility, setVisibility] = useState<"all" | "internal" | "external">(initialVisibility);
  const [appearance, setAppearance] = useState<"all" | DubbingTestAppearanceEstimate>(initialAppearance);

  function applyFilters() {
    const query = new URLSearchParams();
    const normalizedQ = q.trim();

    if (normalizedQ) {
      query.set("q", normalizedQ);
    }

    if (visibility !== "all") {
      query.set("visibility", visibility);
    }

    if (appearance !== "all") {
      query.set("appearance", appearance);
    }

    const search = query.toString();
    router.push(`/${locale}/oportunidades${search ? `?${search}` : ""}`);
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--color-border-soft)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[240px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por teste, comunidade ou personagem..."
            className="pl-9"
          />
        </label>

        <Button type="button" onClick={applyFilters}>Aplicar</Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/55">Tipo do teste</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Todos" },
            { value: "external", label: "Externo" },
            { value: "internal", label: "Interno" },
          ].map((option) => {
            const isActive = visibility === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibility(option.value as "all" | "internal" | "external")}
                className={`inline-flex h-9 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                    : "border-black/15 bg-white text-black/70 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/55">Aparição</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Todas" },
            { value: "protagonista", label: "Protagonista" },
            { value: "coadjuvante", label: "Coadjuvante" },
            { value: "pontas", label: "Pontas" },
            { value: "figurante", label: "Figurante" },
            { value: "voz_adicional", label: "Voz adicional" },
          ].map((option) => {
            const isActive = appearance === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAppearance(option.value as "all" | DubbingTestAppearanceEstimate)}
                className={`inline-flex h-9 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                    : "border-black/15 bg-white text-black/70 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-black/55">
        Testes internos só aparecem para membros ativos da comunidade dona do teste.
      </p>
    </div>
  );
}
