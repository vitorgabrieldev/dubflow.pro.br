"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  FileAudio2,
  FileImage,
  FileVideo2,
  Info,
  Layers3,
  Loader2,
  ListVideo,
  PlusCircle,
  Sparkles,
  UploadCloud,
  UserRoundSearch,
  X,
} from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import type { PublishOrganizationOption, UserPreview } from "@/types/api";

type PublishEpisodeFormProps = {
  locale: string;
  options: PublishOrganizationOption[];
  mode?: "create" | "edit";
  postId?: number;
  initialValues?: {
    title?: string | null;
    description?: string | null;
    work_title?: string | null;
    language_code?: string | null;
    organization_slug?: string | null;
    playlist_id?: number | null;
    season_id?: number | null;
    allow_comments?: boolean;
    show_likes_count?: boolean;
    show_views_count?: boolean;
    duration_seconds?: number | null;
    collaborator_groups?: CollaboratorGroupInput[];
  };
};

type SeasonMode = "none" | "existing" | "new";
type CollaboratorTag = {
  key: string;
  label: string;
  userId: number | null;
};
type CollaboratorGroupInput = {
  role: string;
  people: {
    user_id: number | null;
    label: string;
  }[];
};
type CollaboratorGroupState = {
  id: string;
  role: string;
  people: CollaboratorTag[];
};

const LANGUAGE_OPTIONS = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
] as const;
const DEFAULT_COLLABORATOR_ROLE = "Direção";

export function PublishEpisodeForm({ locale, options, mode = "create", postId, initialValues }: PublishEpisodeFormProps) {
  const isEditMode = mode === "edit";
  const MAX_MEDIA_FILES = 40;
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState(initialValues?.organization_slug ?? options[0]?.slug ?? "");
  const selectedOrganization = useMemo(
    () => options.find((item) => item.slug === organizationSlug) ?? null,
    [options, organizationSlug]
  );
  const playlists = useMemo(() => selectedOrganization?.playlists ?? [], [selectedOrganization]);
  const [playlistId, setPlaylistId] = useState(initialValues?.playlist_id ? String(initialValues.playlist_id) : String(playlists[0]?.id ?? ""));
  const selectedPlaylist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId) ?? null,
    [playlists, playlistId]
  );
  const seasons = selectedPlaylist?.seasons ?? [];

  const [seasonMode, setSeasonMode] = useState<SeasonMode>(() => {
    if (initialValues?.season_id) {
      return "existing";
    }
    return seasons.length > 0 ? "existing" : "none";
  });
  const [existingSeasonId, setExistingSeasonId] = useState(
    initialValues?.season_id ? String(initialValues.season_id) : String(seasons[0]?.id ?? "")
  );

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [computedDuration, setComputedDuration] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorGroupState[]>(() =>
    buildInitialCollaboratorGroups(initialValues?.collaborator_groups)
  );
  const [collaboratorInputByGroup, setCollaboratorInputByGroup] = useState<Record<string, string>>({});
  const [collaboratorSuggestionsByGroup, setCollaboratorSuggestionsByGroup] = useState<Record<string, UserPreview[]>>({});
  const [collaboratorLoadingByGroup, setCollaboratorLoadingByGroup] = useState<Record<string, boolean>>({});
  const [collaboratorPanelOpen, setCollaboratorPanelOpen] = useState(
    () => (initialValues?.collaborator_groups?.length ?? 0) > 0
  );
  const requestCounterRef = useRef<Record<string, number>>({});

  const selectedOrganizationName = selectedOrganization?.name ?? "Selecione uma comunidade";
  const selectedPlaylistName = playlistId
    ? selectedPlaylist?.title ?? "Selecione uma playlist"
    : "Episódio avulso (sem playlist)";
  const collaboratorsPayload = useMemo(() => {
    const normalized = collaboratorGroups
      .map((group) => {
        const role = group.role.trim();
        if (!role) {
          return null;
        }

        const people = group.people
          .map((person) => ({
            user_id: person.userId,
            label: person.label.trim(),
          }))
          .filter((person) => person.label !== "");

        if (people.length === 0) {
          return null;
        }

        return {
          role,
          people,
        };
      })
      .filter((group): group is CollaboratorGroupInput => Boolean(group));

    return JSON.stringify(normalized);
  }, [collaboratorGroups]);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    const transfer = new DataTransfer();
    for (const file of files) {
      transfer.items.add(file);
    }
    input.files = transfer.files;
  }, [files]);

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl) {
        URL.revokeObjectURL(thumbnailObjectUrl);
      }
    };
  }, [thumbnailObjectUrl]);

  useEffect(() => {
    let cancelled = false;

    async function resolveDuration() {
      const playableFiles = files.filter((file) => file.type.startsWith("audio/") || file.type.startsWith("video/"));
      if (playableFiles.length === 0) {
        setComputedDuration(0);
        return;
      }

      const durations = await Promise.all(playableFiles.map((file) => getMediaDuration(file)));
      if (cancelled) {
        return;
      }

      const maxDuration = Math.max(0, ...durations.filter((value) => Number.isFinite(value)));
      setComputedDuration(maxDuration > 0 ? Math.min(3600, Math.max(1, Math.round(maxDuration))) : 0);
    }

    void resolveDuration();

    return () => {
      cancelled = true;
    };
  }, [files]);

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const nextFiles = Array.from(fileList).filter((file) => {
      return file.type.startsWith("audio/") || file.type.startsWith("video/") || file.type.startsWith("image/");
    });

    if (nextFiles.length === 0) {
      return;
    }

    setFiles((current) => {
      const merged = [...current, ...nextFiles];
      if (merged.length > MAX_MEDIA_FILES) {
        setUploadError(`Você pode enviar no máximo ${MAX_MEDIA_FILES} arquivos por episódio.`);
        return merged.slice(0, MAX_MEDIA_FILES);
      }

      setUploadError(null);
      return merged;
    });
  }

  function removeFile(indexToRemove: number) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
    setUploadError(null);
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function onThumbnailChange(file: File | null) {
    if (thumbnailObjectUrl) {
      URL.revokeObjectURL(thumbnailObjectUrl);
      setThumbnailObjectUrl(null);
    }

    if (!file) {
      setThumbnailPreview(null);
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setThumbnailObjectUrl(nextPreview);
    setThumbnailPreview(nextPreview);
  }

  function selectOrganization(slug: string) {
    setOrganizationSlug(slug);
    const nextOrganization = options.find((item) => item.slug === slug);
    const nextPlaylist = nextOrganization?.playlists?.[0];
    const nextSeasons = nextPlaylist?.seasons ?? [];
    setPlaylistId(nextPlaylist ? String(nextPlaylist.id) : "");
    setExistingSeasonId(nextSeasons[0] ? String(nextSeasons[0].id) : "");
    setSeasonMode(nextSeasons.length > 0 ? "existing" : "none");
    setOrganizationOpen(false);
  }

  function selectPlaylist(id: string) {
    setPlaylistId(id);

    if (!id) {
      setExistingSeasonId("");
      setSeasonMode("none");
      setPlaylistOpen(false);
      return;
    }

    const nextPlaylist = playlists.find((item) => String(item.id) === id);
    const nextSeasons = nextPlaylist?.seasons ?? [];
    setExistingSeasonId(nextSeasons[0] ? String(nextSeasons[0].id) : "");
    setSeasonMode(nextSeasons.length > 0 ? "existing" : "none");
    setPlaylistOpen(false);
  }

  function addCollaboratorGroup() {
    setCollaboratorGroups((current) => [
      ...current,
      {
        id: createLocalId(),
        role: "",
        people: [],
      },
    ]);
  }

  function removeCollaboratorGroup(groupId: string) {
    setCollaboratorGroups((current) => current.filter((group) => group.id !== groupId));
    setCollaboratorInputByGroup((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
    setCollaboratorSuggestionsByGroup((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
    setCollaboratorLoadingByGroup((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  }

  function updateCollaboratorRole(groupId: string, value: string) {
    setCollaboratorGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              role: value,
            }
          : group
      )
    );
  }

  async function loadUserSuggestions(groupId: string, rawQuery: string) {
    const query = rawQuery.trim();
    setCollaboratorInputByGroup((current) => ({
      ...current,
      [groupId]: rawQuery,
    }));

    if (query.length < 2) {
      setCollaboratorSuggestionsByGroup((current) => ({
        ...current,
        [groupId]: [],
      }));
      setCollaboratorLoadingByGroup((current) => ({
        ...current,
        [groupId]: false,
      }));
      return;
    }

    const requestId = (requestCounterRef.current[groupId] ?? 0) + 1;
    requestCounterRef.current[groupId] = requestId;

    setCollaboratorLoadingByGroup((current) => ({
      ...current,
      [groupId]: true,
    }));

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=8`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setCollaboratorSuggestionsByGroup((current) => ({
          ...current,
          [groupId]: [],
        }));
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { users?: UserPreview[] };
      if ((requestCounterRef.current[groupId] ?? 0) !== requestId) {
        return;
      }

      setCollaboratorSuggestionsByGroup((current) => ({
        ...current,
        [groupId]: Array.isArray(payload.users) ? payload.users : [],
      }));
    } catch {
      setCollaboratorSuggestionsByGroup((current) => ({
        ...current,
        [groupId]: [],
      }));
    } finally {
      if ((requestCounterRef.current[groupId] ?? 0) === requestId) {
        setCollaboratorLoadingByGroup((current) => ({
          ...current,
          [groupId]: false,
        }));
      }
    }
  }

  function addCollaboratorTag(groupId: string, person: { label: string; userId: number | null }) {
    const nextLabel = person.label.trim();
    if (!nextLabel) {
      return;
    }

    setCollaboratorGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const hasDuplicate = group.people.some((existing) => {
          if (person.userId !== null && existing.userId !== null) {
            return existing.userId === person.userId;
          }

          return existing.label.toLocaleLowerCase() === nextLabel.toLocaleLowerCase();
        });

        if (hasDuplicate) {
          return group;
        }

        return {
          ...group,
          people: [
            ...group.people,
            {
              key: createLocalId(),
              label: nextLabel,
              userId: person.userId,
            },
          ],
        };
      })
    );

    setCollaboratorInputByGroup((current) => ({
      ...current,
      [groupId]: "",
    }));
    setCollaboratorSuggestionsByGroup((current) => ({
      ...current,
      [groupId]: [],
    }));
  }

  function addTypedCollaboratorTag(groupId: string) {
    const typedValue = collaboratorInputByGroup[groupId] ?? "";
    const normalized = typedValue.trim();
    if (!normalized) {
      return;
    }

    const suggestions = collaboratorSuggestionsByGroup[groupId] ?? [];
    const match = suggestions.find((user) => {
      const stage = user.stage_name?.trim().toLocaleLowerCase();
      const fullName = user.name?.trim().toLocaleLowerCase();
      const username = user.username?.trim().toLocaleLowerCase();
      const target = normalized.toLocaleLowerCase();
      return stage === target || fullName === target || username === target;
    });

    if (match) {
      addCollaboratorTag(groupId, {
        userId: match.id,
        label: match.stage_name?.trim() || match.name,
      });
      return;
    }

    addCollaboratorTag(groupId, {
      userId: null,
      label: normalized,
    });
  }

  function removeCollaboratorTag(groupId: string, tagKey: string) {
    setCollaboratorGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              people: group.people.filter((person) => person.key !== tagKey),
            }
          : group
      )
    );
  }

  const formAction = isEditMode && postId ? `/api/posts/${postId}/update` : "/api/posts/create";

  return (
    <form action={formAction} method="post" encType="multipart/form-data" className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="organization_slug" value={organizationSlug} />
      <input type="hidden" name="playlist_id" value={playlistId} />
      <input type="hidden" name="duration_seconds" value={String(isEditMode ? initialValues?.duration_seconds ?? 0 : computedDuration)} />
      <input type="hidden" name="collaborators_payload" value={collaboratorsPayload} />

      <div className="space-y-4 rounded-[8px] border border-black/10 bg-black/[0.025] p-4">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]">
            <Clapperboard size={14} />
            Comunidade
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOrganizationOpen((current) => !current)}
              className="flex h-10 w-full cursor-pointer items-center justify-between rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm"
            >
              <span className="line-clamp-1 text-left">{selectedOrganizationName}</span>
              <ChevronDown size={14} />
            </button>

            {organizationOpen ? (
              <div className="absolute z-20 mt-1 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white p-1 shadow-xl">
                <a
                  href={`/${locale}/nova-organizacao`}
                  className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                >
                  <PlusCircle size={14} />
                  Criar nova comunidade
                </a>

                <div className="my-1 border-t border-black/10" />

                {options.map((organization) => (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => selectOrganization(organization.slug)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-black/5"
                  >
                    <span className="line-clamp-1">{organization.name}</span>
                    {organization.slug === organizationSlug ? <Check size={14} className="text-[var(--color-primary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]">
            <ListVideo size={14} />
            Playlist
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setPlaylistOpen((current) => !current)}
              className="flex h-10 w-full cursor-pointer items-center justify-between rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm"
            >
              <span className="line-clamp-1 text-left">
                {playlists.length > 0 ? selectedPlaylistName : "Episódio avulso (sem playlist)"}
              </span>
              <ChevronDown size={14} />
            </button>

            {playlistOpen ? (
              <div className="absolute z-20 mt-1 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => selectPlaylist("")}
                  className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-black/5"
                >
                  <span className="line-clamp-1">Episódio avulso (sem playlist)</span>
                  {!playlistId ? <Check size={14} className="text-[var(--color-primary)]" /> : null}
                </button>

                <div className="my-1 border-t border-black/10" />

                <a
                  href={`/${locale}/nova-playlist?organization=${encodeURIComponent(organizationSlug)}`}
                  className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                >
                  <PlusCircle size={14} />
                  Criar nova playlist
                </a>

                {playlists.length > 0 ? <div className="my-1 border-t border-black/10" /> : null}

                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => selectPlaylist(String(playlist.id))}
                    className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-black/5"
                  >
                    <span className="line-clamp-1">{playlist.title}</span>
                    {String(playlist.id) === playlistId ? <Check size={14} className="text-[var(--color-primary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {playlistId ? (
        <div className="space-y-3 rounded-[8px] border border-black/10 bg-black/[0.03] p-4">
          <p className="flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]">
            <Layers3 size={14} />
            Temporada do episódio
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-black/75">
              <input
                type="radio"
                name="season_mode"
                value="none"
                checked={seasonMode === "none"}
                onChange={() => setSeasonMode("none")}
                className="accent-[var(--color-primary)]"
              />
              Episódio avulso (sem temporada)
            </label>

            {seasons.length > 0 ? (
              <label className="flex items-center gap-2 text-sm text-black/75">
                <input
                  type="radio"
                  name="season_mode"
                  value="existing"
                  checked={seasonMode === "existing"}
                  onChange={() => setSeasonMode("existing")}
                  className="accent-[var(--color-primary)]"
                />
                Selecionar temporada existente
              </label>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-black/75">
              <input
                type="radio"
                name="season_mode"
                value="new"
                checked={seasonMode === "new"}
                onChange={() => setSeasonMode("new")}
                className="accent-[var(--color-primary)]"
              />
              Criar nova temporada
            </label>
          </div>

          {seasonMode === "existing" && seasons.length > 0 ? (
            <select
              name="season_id"
              value={existingSeasonId}
              onChange={(event) => setExistingSeasonId(event.target.value)}
              className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              required
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  T{season.season_number} • {season.episodes_count ?? 0} episódios
                </option>
              ))}
            </select>
          ) : null}

          {seasonMode === "new" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-black/75">
                <span>Número da temporada</span>
                <Input name="season_number" type="number" min={1} placeholder="1" required />
              </label>
              <label className="space-y-1 text-sm text-black/75">
                <span>Título da temporada (opcional)</span>
                <Input name="season_title" placeholder="Temporada 1" />
              </label>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/10 bg-black/[0.03] p-4 text-sm text-black/65">
          Este episódio será publicado sem playlist e sem temporada.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-black/75 sm:col-span-2">
          <span>Título do episódio</span>
          <Input name="title" defaultValue={initialValues?.title ?? ""} placeholder="Episódio 01" required />
        </label>

        <label className="space-y-1 text-sm text-black/75">
          <span>Obra</span>
          <Input name="work_title" defaultValue={initialValues?.work_title ?? ""} required />
        </label>

        <label className="space-y-1 text-sm text-black/75">
          <span>Idioma</span>
          <select
            name="language_code"
            defaultValue={initialValues?.language_code ?? "pt-BR"}
            className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            required
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm text-black/75 sm:col-span-2">
          <span>Descrição</span>
          <Input name="description" defaultValue={initialValues?.description ?? ""} placeholder="Sinopse e observações do episódio" />
        </label>
      </div>

      <details
        className="group/collaborators rounded-[8px] border border-black/10 bg-black/[0.02] p-4"
        open={collaboratorPanelOpen}
        onToggle={(event) => {
          const element = event.currentTarget as HTMLDetailsElement;
          setCollaboratorPanelOpen(element.open);
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <span className="inline-flex items-center gap-1">
            <Sparkles size={14} />
            Colaboradores
          </span>
          <ChevronDown size={14} className="transition-transform duration-300 group-open/collaborators:rotate-180" />
        </summary>

        <p className="mt-2 text-xs text-black/60">
          Adicione a função e marque as pessoas com tags. Se não quiser vincular uma conta, digite o nome e pressione Enter.
        </p>

        <div className="mt-3 space-y-3">
          {collaboratorGroups.map((group, index) => (
            <div key={group.id} className="rounded-[8px] border border-black/10 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-w-[220px] flex-1 space-y-1 text-xs text-black/60">
                  <span>Função</span>
                  <Input
                    value={group.role}
                    onChange={(event) => updateCollaboratorRole(group.id, event.target.value)}
                    placeholder={index === 0 ? DEFAULT_COLLABORATOR_ROLE : "Ex.: Mixagem, Edição, Tradução..."}
                    className="h-10"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeCollaboratorGroup(group.id)}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[8px] border border-black/10 px-3 text-xs font-semibold text-black/65 transition hover:bg-black/[0.04]"
                >
                  Remover função
                </button>
              </div>

              <div className="relative mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-2 py-2">
                  {group.people.map((person) => (
                    <span
                      key={person.key}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-2.5 text-xs font-semibold text-[var(--color-ink)]"
                    >
                      {person.label}
                      <button
                        type="button"
                        onClick={() => removeCollaboratorTag(group.id, person.key)}
                        className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-black/55 transition hover:bg-black/10"
                        aria-label="Remover colaborador"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  <input
                    value={collaboratorInputByGroup[group.id] ?? ""}
                    onChange={(event) => {
                      void loadUserSuggestions(group.id, event.target.value);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setCollaboratorSuggestionsByGroup((current) => ({
                          ...current,
                          [group.id]: [],
                        }));
                      }, 120);
                    }}
                    onFocus={() => {
                      const currentInput = collaboratorInputByGroup[group.id] ?? "";
                      if (currentInput.trim().length >= 2) {
                        void loadUserSuggestions(group.id, currentInput);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTypedCollaboratorTag(group.id);
                      }
                    }}
                    placeholder="Digite um nome e pressione Enter"
                    className="h-8 min-w-[180px] flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none"
                  />

                  {collaboratorLoadingByGroup[group.id] ? <Loader2 size={14} className="animate-spin text-black/50" /> : null}
                </div>

                {(collaboratorSuggestionsByGroup[group.id] ?? []).length > 0 ? (
                  <div className="absolute z-20 max-h-64 w-full overflow-auto rounded-[8px] border border-black/10 bg-white p-1 shadow-lg">
                    {(collaboratorSuggestionsByGroup[group.id] ?? []).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          addCollaboratorTag(group.id, {
                            userId: user.id,
                            label: user.stage_name?.trim() || user.name,
                          });
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[6px] px-2 py-2 text-left hover:bg-black/[0.04]"
                      >
                        <span className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{user.stage_name?.trim() || user.name}</span>
                        <span className="line-clamp-1 text-xs text-black/55">@{user.username ?? "sem-usuario"}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCollaboratorGroup}
          className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-black/15 px-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-black/[0.03]"
        >
          <UserRoundSearch size={14} />
          Adicionar função
        </button>
      </details>

      {!isEditMode ? (
      <div className="space-y-3 rounded-[8px] border border-black/10 bg-black/[0.025] p-4">
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]">
          <UploadCloud size={14} />
          Upload de mídias
        </p>

        <div
          role="button"
          tabIndex={0}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFiles(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDraggingFiles(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFiles(false);
            handleAddFiles(event.dataTransfer.files);
          }}
          onClick={triggerFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              triggerFilePicker();
            }
          }}
          className={`rounded-[8px] border border-dashed px-4 py-5 text-center transition ${
            isDraggingFiles
              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
              : "border-[var(--color-border-soft)] bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-[var(--color-ink)]">Arraste e solte seus arquivos aqui</p>
          <p className="mt-1 text-xs text-black/60">
            Você pode misturar áudio, vídeo e imagens em vários arquivos (máx. 1 GB por arquivo, até 40 arquivos).
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
            <PlusCircle size={13} />
            Selecionar arquivos
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          name="media_assets[]"
          multiple
          required={files.length === 0}
          accept="video/*,audio/*,image/*"
          onChange={(event) => {
            handleAddFiles(event.target.files);
            event.currentTarget.value = "";
          }}
          className="hidden"
        />

        {files.length === 0 ? (
          <p className="text-xs text-black/55">Nenhuma mídia selecionada.</p>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between rounded-[8px] border border-black/10 bg-white px-3 py-2">
                <span className="min-w-0 inline-flex items-center gap-2">
                  {file.type.startsWith("video/") ? <FileVideo2 size={14} /> : null}
                  {file.type.startsWith("audio/") ? <FileAudio2 size={14} /> : null}
                  {file.type.startsWith("image/") ? <FileImage size={14} /> : null}
                  <span className="line-clamp-1 text-sm text-[var(--color-ink)]">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] bg-black/5 text-black/70"
                  aria-label="Remover arquivo"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {computedDuration > 0 ? (
          <p className="text-xs text-black/60">Duração detectada automaticamente: {formatDuration(computedDuration)}</p>
        ) : null}
        {uploadError ? <p className="text-xs text-red-700">{uploadError}</p> : null}
      </div>
      ) : (
        <div className="rounded-[8px] border border-black/10 bg-black/[0.03] p-4 text-sm text-black/65">
          A edição mantém os arquivos de mídia atuais deste episódio.
        </div>
      )}

      {!isEditMode ? (
      <label className="space-y-2 text-sm text-black/75">
        <span>Thumbnail (opcional)</span>
        <p className="text-xs text-black/50">Recomendado: 1280x720 (16:9)</p>
        <div className="relative aspect-video max-h-52 w-full overflow-hidden rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.03]">
          {thumbnailPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailPreview} alt="Preview da thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-black/45">
              <FileImage size={18} />
            </div>
          )}
        </div>
        <input
          type="file"
          name="thumbnail"
          accept="image/*"
          onChange={(event) => onThumbnailChange(event.target.files?.[0] ?? null)}
          className="block w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
        />
      </label>
      ) : null}

      <div className="mt-3 space-y-3 rounded-[8px] border border-black/10 bg-black/[0.03] p-4 text-sm text-black/75">
        <OptionSwitch
          name="allow_comments"
          label="Permitir comentários"
          tooltip="Permite que outras pessoas comentem neste episódio."
          defaultChecked={initialValues?.allow_comments ?? true}
        />
        <OptionSwitch
          name="show_likes_count"
          label="Mostrar curtidas"
          tooltip="Exibe a contagem de curtidas no card do episódio."
          defaultChecked={initialValues?.show_likes_count ?? true}
        />
        <OptionSwitch
          name="show_views_count"
          label="Mostrar visualizações"
          tooltip="Exibe a contagem de visualizações no card do episódio."
          defaultChecked={initialValues?.show_views_count ?? true}
        />
      </div>

      <FormSubmitButton
        className="h-11 w-full"
        label={isEditMode ? "Salvar alterações" : "Publicar episódio"}
        loadingLabel={isEditMode ? "Salvando alterações..." : "Publicando episódio..."}
        icon={<ArrowRight size={15} />}
        showPendingOnClick
        disabled={options.length === 0 || !organizationSlug || (!isEditMode && files.length === 0)}
      />
    </form>
  );
}

function OptionSwitch({
  name,
  label,
  tooltip,
  defaultChecked,
}: {
  name: string;
  label: string;
  tooltip: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="mr-3 inline-flex items-center gap-2 py-1">
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="accent-[var(--color-primary)]" />
      <span className="inline-flex items-center gap-1">
        {label}
        <span title={tooltip} className="inline-flex text-black/50">
          <Info size={13} />
        </span>
      </span>
    </label>
  );
}

function buildInitialCollaboratorGroups(initial?: CollaboratorGroupInput[] | null): CollaboratorGroupState[] {
  if (!Array.isArray(initial) || initial.length === 0) {
    return [
      {
        id: createLocalId(),
        role: DEFAULT_COLLABORATOR_ROLE,
        people: [],
      },
    ];
  }

  const groups = initial
    .map((group) => {
      const role = (group.role ?? "").trim();
      const people = Array.isArray(group.people)
        ? group.people
            .map((person) => {
              const label = (person.label ?? "").trim();
              if (!label) {
                return null;
              }

              return {
                key: createLocalId(),
                label,
                userId: person.user_id ?? null,
              };
            })
            .filter((person): person is CollaboratorTag => Boolean(person))
        : [];

      if (!role && people.length === 0) {
        return null;
      }

      return {
        id: createLocalId(),
        role,
        people,
      };
    })
    .filter((group): group is CollaboratorGroupState => Boolean(group));

  if (groups.length === 0) {
    return [
      {
        id: createLocalId(),
        role: DEFAULT_COLLABORATOR_ROLE,
        people: [],
      },
    ];
  }

  return groups;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    media.preload = "metadata";
    media.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    media.onloadedmetadata = () => {
      const value = Number.isFinite(media.duration) ? media.duration : 0;
      cleanup();
      resolve(value > 0 ? value : 0);
    };

    media.onerror = () => {
      cleanup();
      resolve(0);
    };
  });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
