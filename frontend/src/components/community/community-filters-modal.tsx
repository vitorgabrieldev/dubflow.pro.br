"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CommunityFiltersModalProps = {
  locale: string;
  initialQuery: string;
  initialSort: "recent" | "followers" | "playlists" | "name";
};

export function CommunityFiltersModal({
  locale,
  initialQuery,
  initialSort,
}: CommunityFiltersModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<"recent" | "followers" | "playlists" | "name">(initialSort);

  function applyFilters() {
    const query = new URLSearchParams();
    const normalizedQuery = q.trim();

    if (normalizedQuery) {
      query.set("q", normalizedQuery);
    }

    if (sort !== "recent") {
      query.set("sort", sort);
    }

    const search = query.toString();
    router.push(`/${locale}/comunidades${search ? `?${search}` : ""}`);
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters();
  }

  return (
    <>
      <form onSubmit={onSearchSubmit} className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar comunidade..."
            className="pl-9"
          />
        </label>

        <Button type="button" variant="neutral" className="rounded-[8px]" onClick={() => setOpen(true)}>
          <Filter size={14} />
          Filtros
        </Button>
      </form>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[8px] border border-[var(--color-border-soft)] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-[var(--color-ink)]">Filtros de comunidades</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-black/5 text-black/70"
                aria-label="Fechar filtros"
              >
                <X size={14} />
              </button>
            </div>

            <label className="space-y-1.5 text-sm text-black/75">
              <span>Ordenação</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as "recent" | "followers" | "playlists" | "name")}
                className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="recent">Mais recentes</option>
                <option value="followers">Mais seguidas</option>
                <option value="playlists">Mais playlists</option>
                <option value="name">Nome</option>
              </select>
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  setSort("recent");
                  setQ("");
                }}
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  applyFilters();
                  setOpen(false);
                }}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
