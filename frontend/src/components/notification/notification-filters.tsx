"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { CustomSelect } from "@/components/opportunity/custom-select";
import type { NotificationContext } from "@/lib/notifications";

type NotificationFiltersProps = {
  locale: string;
  initialQuery: string;
  initialContext: NotificationContext | "all";
};

const CONTEXT_OPTIONS = [
  { value: "all", label: "Todos contextos" },
  { value: "chat", label: "Chat" },
  { value: "community", label: "Comunidade" },
  { value: "opportunity", label: "Oportunidade" },
  { value: "other", label: "Outros" },
] as const;

export function NotificationFilters({ locale, initialQuery, initialContext }: NotificationFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [context, setContext] = useState<NotificationContext | "all">(initialContext);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const normalizedQuery = query.trim();
    if (normalizedQuery.length > 0) {
      params.set("q", normalizedQuery);
    }
    if (context !== "all") {
      params.set("context", context);
    }

    const queryString = params.toString();
    router.push(`/${locale}/notificacoes${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar notificação..."
        className="h-10 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />

      <CustomSelect
        value={context}
        onChange={(value) => setContext(value as NotificationContext | "all")}
        options={CONTEXT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      />

      <button
        type="submit"
        className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5"
      >
        Filtrar
      </button>
    </form>
  );
}

