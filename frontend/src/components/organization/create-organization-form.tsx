"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PlusCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";

type CreateOrganizationFormProps = {
  locale: string;
};

type CreateOrganizationResponse = {
  message?: string;
  organization?: {
    id: number;
    slug: string;
    name: string;
  };
};

export function CreateOrganizationForm({ locale }: CreateOrganizationFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !pending, [name, pending]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [avatarPreview, coverPreview]);

  function onChangeAvatar(file: File | null) {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatar(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  function onChangeCover(file: File | null) {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCover(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

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
      payload.set("name", name.trim());
      payload.set("description", description.trim());
      payload.set("is_public", isPublic ? "1" : "0");

      if (avatar) {
        payload.set("avatar", avatar);
      }

      if (cover) {
        payload.set("cover", cover);
      }

      const response = await fetch("/api/organizations/create", {
        method: "POST",
        body: payload,
        headers: {
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as CreateOrganizationResponse;

      if (!response.ok || !result.organization) {
        if (response.status === 401) {
          setError("Sessão expirada. Faça login novamente para criar a comunidade.");
          return;
        }

        setError(result.message ?? "Não foi possível criar a comunidade.");
        return;
      }

      setSuccess("Comunidade criada com sucesso.");
      router.push(`/${locale}/organizations/${result.organization.slug}`);
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
        <span className="inline-flex items-center gap-1">Nome da comunidade</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          name="name"
          required
          placeholder="Preencha o nome da comunidade"
        />
      </label>

      <label className="space-y-1 text-sm text-black/75">
        <span>Descrição</span>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          name="description"
          placeholder="Preencha a descrição da comunidade"
        />
      </label>

      <hr className="border-black/10" />

      <div className="space-y-3">
        <label className="space-y-1 text-sm text-black/75">
          <span className="font-medium">Banner</span>
          <p className="text-xs text-black/50">Recomendado: 1600x600 (8:3)</p>
          <div className="relative aspect-[8/3] w-full overflow-hidden rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview ?? "/default-org-banner.svg"} alt="Preview do banner" className="h-full w-full object-cover" />
          </div>
          <input
            type="file"
            name="cover"
            accept="image/*"
            onChange={(event) => onChangeCover(event.target.files?.[0] ?? null)}
            className="block w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
          />
        </label>

        <label className="space-y-1 text-sm text-black/75">
          <span className="font-medium">Avatar</span>
          <p className="text-xs text-black/50">Recomendado: 800x800 (1:1)</p>
          <div className="relative h-28 w-28 overflow-hidden rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarPreview ?? "/default-org-avatar.svg"} alt="Preview do avatar" className="h-full w-full object-cover" />
          </div>
          <input
            type="file"
            name="avatar"
            accept="image/*"
            onChange={(event) => onChangeAvatar(event.target.files?.[0] ?? null)}
            className="block w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
          />
        </label>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-black/70">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="cursor-pointer accent-[var(--color-primary)]"
        />
        <span className="inline-flex items-center gap-1">
          Comunidade pública
          <InfoTooltip message="Comunidades públicas: qualquer pessoa pode entrar e publicar. Privadas: precisa ser convidado por um membro." />
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
        {pending ? "Criando comunidade..." : "Criar comunidade"}
      </Button>
    </form>
  );
}
