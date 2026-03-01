"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlaylistFiltersModalProps = {
  locale: string;
  initialQuery: string;
  initialUser: string;
  initialOrganization: string;
  initialSort: "recent" | "popular" | "title";
};

export function PlaylistFiltersModal({
  locale,
  initialQuery,
  initialUser,
  initialOrganization,
  initialSort,
}: PlaylistFiltersModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const [user, setUser] = useState(initialUser);
  const [organization, setOrganization] = useState(initialOrganization);
  const [sort, setSort] = useState<"recent" | "popular" | "title">(initialSort);

  function applyFilters() {
    const query = new URLSearchParams();
    const normalizedQ = q.trim();
    const normalizedUser = user.trim();
    const normalizedOrganization = organization.trim();

    if (normalizedQ) {
      query.set("q", normalizedQ);
    }

    if (normalizedUser) {
      query.set("user", normalizedUser);
    }

    if (normalizedOrganization) {
      query.set("organization", normalizedOrganization);
    }

    if (sort !== "recent") {
      query.set("sort", sort);
    }

    const search = query.toString();
    router.push(`/${locale}/playlists${search ? `?${search}` : ""}`);
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
            placeholder="Buscar playlist ou obra..."
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
              <p className="text-base font-semibold text-[var(--color-ink)]">Filtros de playlists</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-black/5 text-black/70"
                aria-label="Fechar filtros"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="space-y-1.5 text-sm text-black/75">
                <span className="inline-flex items-center gap-1">
                  <UserRound size={13} />
                  Usuário
                </span>
                <Input
                  value={user}
                  onChange={(event) => setUser(event.target.value)}
                  placeholder="Nome, @username ou nome artístico"
                />
              </label>

              <label className="space-y-1.5 text-sm text-black/75">
                <span>Comunidade (slug)</span>
                <Input
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  placeholder="ex.: dubflow-coletivo"
                />
              </label>

              <label className="space-y-1.5 text-sm text-black/75">
                <span>Ordenação</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as "recent" | "popular" | "title")}
                  className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="popular">Mais populares</option>
                  <option value="title">Título</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  setQ("");
                  setUser("");
                  setOrganization("");
                  setSort("recent");
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
