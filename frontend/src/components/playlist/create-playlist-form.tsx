"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clapperboard, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlaylistOrganizationOption = {
  id: number;
  slug: string;
  name: string;
};

type CreatePlaylistFormProps = {
  locale: string;
  organizations: PlaylistOrganizationOption[];
  initialOrganizationSlug?: string;
};

type CreatePlaylistResponse = {
  message?: string;
  organization_slug?: string;
  playlist?: {
    id: number;
    slug: string;
  };
};

export function CreatePlaylistForm({
  locale,
  organizations,
  initialOrganizationSlug,
}: CreatePlaylistFormProps) {
  const router = useRouter();
  const [organizationSlug, setOrganizationSlug] = useState(initialOrganizationSlug ?? organizations[0]?.slug ?? "");
  const [title, setTitle] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !pending && organizations.length > 0 && Boolean(organizationSlug) && title.trim().length > 0 && releaseYear.trim().length > 0,
    [organizationSlug, organizations.length, pending, releaseYear, title]
  );

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
      payload.set("locale", locale);
      payload.set("organization_slug", organizationSlug);
      payload.set("title", title.trim());
      payload.set("work_title", workTitle.trim());
      payload.set("description", description.trim());
      payload.set("release_year", releaseYear.trim());

      const response = await fetch("/api/playlists/create", {
        method: "POST",
        body: payload,
        headers: {
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as CreatePlaylistResponse;
      if (!response.ok || !result.playlist) {
        if (response.status === 401) {
          setError("Sessão expirada. Faça login novamente para criar a playlist.");
          return;
        }

        setError(result.message ?? "Não foi possível criar a playlist.");
        return;
      }

      const nextOrganizationSlug = result.organization_slug ?? organizationSlug;
      setSuccess("Playlist criada com sucesso.");
      router.push(`/${locale}/playlists/${nextOrganizationSlug}/${result.playlist.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {success ? (
        <p className="inline-flex items-center gap-2 rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} />
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="inline-flex items-center gap-2 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle size={14} />
          {error}
        </p>
      ) : null}

      <label className="space-y-1 text-sm text-black/75">
        <span>Comunidade</span>
        <select
          name="organization_slug"
          value={organizationSlug}
          onChange={(event) => setOrganizationSlug(event.target.value)}
          className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          required
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.slug}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm text-black/75">
        <span>Título da playlist</span>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} name="title" required placeholder="Preencha o título da playlist" />
      </label>

      <label className="space-y-1 text-sm text-black/75">
        <span>Obra</span>
        <Input
          value={workTitle}
          onChange={(event) => setWorkTitle(event.target.value)}
          name="work_title"
          placeholder="Preencha a obra da playlist"
        />
      </label>

      <label className="space-y-1 text-sm text-black/75">
        <span>Descrição</span>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          name="description"
          placeholder="Preencha a descrição da playlist"
        />
      </label>

      <label className="space-y-1 text-sm text-black/75">
        <span>Ano</span>
        <Input
          value={releaseYear}
          onChange={(event) => setReleaseYear(event.target.value)}
          name="release_year"
          type="number"
          min={1900}
          max={2100}
          required
          placeholder="Preencha o ano da obra"
        />
      </label>

      <Button type="submit" className="mt-2 w-full" disabled={!canSubmit}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />}
        {pending ? "Criando playlist..." : "Criar playlist"}
      </Button>
    </form>
  );
}
