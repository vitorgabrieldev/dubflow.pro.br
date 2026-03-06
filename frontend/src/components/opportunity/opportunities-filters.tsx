"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const hasAdvancedFilters = visibility !== "all" || appearance !== "all";

  const closeAdvancedFilters = useCallback(() => {
    setAdvancedVisible(false);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setAdvancedOpen(false);
      closeTimerRef.current = null;
    }, 220);
  }, []);

  const openAdvancedFilters = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setAdvancedOpen(true);
    window.requestAnimationFrame(() => {
      setAdvancedVisible(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!advancedOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAdvancedFilters();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [advancedOpen, closeAdvancedFilters]);

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

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters();
  }

  return (
    <>
      <div className="space-y-3 rounded-[10px] border border-[var(--color-border-soft)] bg-white p-4">
        <form onSubmit={onSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-[260px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar por teste, comunidade ou personagem..."
              className="h-11 rounded-[10px] pl-9 pr-36"
            />
            <Button
              type="submit"
              className="absolute right-1.5 top-1/2 h-8 min-w-[120px] -translate-y-1/2 gap-2.5 rounded-[10px] px-4 text-xs"
            >
              <Search size={13} />
              Buscar
            </Button>
          </label>

          <Button type="button" variant="neutral" className="rounded-[8px]" onClick={openAdvancedFilters}>
            <SlidersHorizontal size={14} />
            Filtros avançados
            {hasAdvancedFilters ? <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden="true" /> : null}
          </Button>
        </form>

        <p className="text-xs text-black/55">
          Testes internos só aparecem para membros ativos da comunidade dona do teste.
        </p>
      </div>

      {advancedOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className={`absolute inset-0 bg-black/45 backdrop-blur-[1.5px] transition-opacity duration-200 ${
              advancedVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeAdvancedFilters}
            aria-label="Fechar filtros avançados"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filtros avançados"
            className={`relative z-10 w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[var(--color-border-soft)] bg-white p-5 shadow-2xl transition-all duration-200 ${
              advancedVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.985] opacity-0"
            }`}
          >
            <div className="mb-5 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                <Filter size={15} />
                Filtros avançados
              </p>
              <button
                type="button"
                onClick={closeAdvancedFilters}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-black/5 text-black/70"
                aria-label="Fechar filtros"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-5">
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
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 pt-4">
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  setVisibility("all");
                  setAppearance("all");
                }}
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  applyFilters();
                  closeAdvancedFilters();
                }}
              >
                Aplicar filtros
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
