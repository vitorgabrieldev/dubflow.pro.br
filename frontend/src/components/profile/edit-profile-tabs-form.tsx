"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { PasswordInput } from "@/components/auth/password-input";
import { ImageUploadField } from "@/components/profile/image-upload-field";
import { TagInput } from "@/components/profile/tag-input";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { LOCALE_META, SUPPORTED_LOCALES } from "@/lib/i18n";

type EditableUser = {
  name?: string;
  stage_name?: string | null;
  pronouns?: string | null;
  username?: string | null;
  email?: string | null;
  locale?: string | null;
  created_at?: string | null;
  bio?: string | null;
  skills?: string[];
  dubbing_languages?: string[];
  voice_accents?: string[];
  has_recording_equipment?: boolean;
  recording_equipment?: string[];
  recording_equipment_other?: string | null;
  weekly_availability?: string[];
  state?: string | null;
  city?: string | null;
  proposal_contact_preferences?: string[];
  proposal_contact_links?: {
    email?: string | null;
    whatsapp?: string | null;
    discord?: string | null;
  };
  tags?: string[];
  dubbing_history?: string | null;
};

type AccountDeletionPreview = {
  can_delete?: boolean;
  required_confirmation_phrase?: string;
  blocker?: { code?: string; message?: string } | null;
  owned_organizations?: Array<{ id: number; name: string; slug: string }>;
  summary?: Array<{ key: string; label: string; count: number }>;
  total_items?: number;
} | null;

type EditProfileTabsFormProps = {
  locale: string;
  user: EditableUser;
  updated: boolean;
  hasError: boolean;
  profileErrorMessage: string | null;
  hasPasswordError: boolean;
  deleteError: string | null;
  accountDeletionPreview: AccountDeletionPreview;
  coverSrc: string | null;
  avatarSrc: string | null;
};

type TabId = "conta" | "publico" | "seguranca";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "conta", label: "Conta" },
  { id: "publico", label: "Perfil público" },
  { id: "seguranca", label: "Segurança" },
];

const WEEKDAY_OPTIONS = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
] as const;

const CONTACT_PREFERENCE_OPTIONS = [
  { value: "dm_plataforma", label: "Mensagem na plataforma" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "discord", label: "Discord" },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: "microfone_condensador", label: "Microfone condensador" },
  { value: "microfone_dinamico", label: "Microfone dinâmico" },
  { value: "interface_audio", label: "Interface de áudio" },
  { value: "tratamento_acustico", label: "Tratamento acústico" },
  { value: "booth", label: "Booth/cabine" },
] as const;

function formatMembershipDate(value?: string | null) {
  function capitalizeFirst(input: string) {
    if (!input) {
      return input;
    }

    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  if (!value) {
    return "Data indisponível";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) {
    return "Agora";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (diffMs < hour) {
    return capitalizeFirst(formatter.format(-Math.max(1, Math.floor(diffMs / minute)), "minute"));
  }
  if (diffMs < day) {
    return capitalizeFirst(formatter.format(-Math.floor(diffMs / hour), "hour"));
  }
  if (diffMs < week) {
    return capitalizeFirst(formatter.format(-Math.floor(diffMs / day), "day"));
  }
  if (diffMs < month) {
    return capitalizeFirst(formatter.format(-Math.floor(diffMs / week), "week"));
  }
  if (diffMs < year) {
    return capitalizeFirst(formatter.format(-Math.floor(diffMs / month), "month"));
  }

  return capitalizeFirst(formatter.format(-Math.floor(diffMs / year), "year"));
}

function formatWhatsappFieldValue(inputValue: string) {
  const normalized = inputValue.trim();

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const digits = normalized.replace(/\D+/g, "").slice(0, 13);
  if (!digits) {
    return "";
  }

  let countryCode = "";
  let localDigits = digits;

  if (digits.length > 11) {
    countryCode = digits.slice(0, digits.length - 11);
    localDigits = digits.slice(-11);
  }

  const areaCode = localDigits.slice(0, 2);
  const numberDigits = localDigits.slice(2);

  let formattedLocal = "";
  if (areaCode.length > 0) {
    formattedLocal = `(${areaCode}`;
    if (areaCode.length === 2) {
      formattedLocal += ")";
    }
  }

  if (numberDigits.length > 0) {
    if (areaCode.length === 2) {
      formattedLocal += " ";
    }

    if (numberDigits.length <= 4) {
      formattedLocal += numberDigits;
    } else if (numberDigits.length <= 8) {
      formattedLocal += `${numberDigits.slice(0, 4)}-${numberDigits.slice(4)}`;
    } else {
      formattedLocal += `${numberDigits.slice(0, 5)}-${numberDigits.slice(5, 9)}`;
    }
  }

  if (!formattedLocal) {
    return "";
  }

  return countryCode ? `+${countryCode} ${formattedLocal}` : formattedLocal;
}

export function EditProfileTabsForm({
  locale,
  user,
  updated,
  hasError,
  profileErrorMessage,
  hasPasswordError,
  deleteError,
  accountDeletionPreview,
  coverSrc,
  avatarSrc,
}: EditProfileTabsFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("conta");
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [hasRecordingEquipment, setHasRecordingEquipment] = useState(Boolean(user.has_recording_equipment));
  const [weeklyAvailability, setWeeklyAvailability] = useState<string[]>(() =>
    Array.isArray(user.weekly_availability) ? user.weekly_availability : []
  );
  const [proposalContactPreferences, setProposalContactPreferences] = useState<string[]>(() =>
    Array.isArray(user.proposal_contact_preferences) ? user.proposal_contact_preferences : []
  );
  const [recordingEquipment, setRecordingEquipment] = useState<string[]>(() =>
    Array.isArray(user.recording_equipment) ? user.recording_equipment : []
  );
  const [proposalContactLinks, setProposalContactLinks] = useState<{
    email: string;
    whatsapp: string;
    discord: string;
  }>(() => ({
    email: user.proposal_contact_links?.email?.trim() || user.email?.trim() || "",
    whatsapp: formatWhatsappFieldValue(user.proposal_contact_links?.whatsapp?.trim() || ""),
    discord: user.proposal_contact_links?.discord?.trim() || "",
  }));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [isPromptSaving, setIsPromptSaving] = useState(false);
  const unsavedPromptRef = useRef<HTMLDivElement | null>(null);
  const formId = "profile-edit-form";
  const isSecurityTab = activeTab === "seguranca";
  const canDeleteAccount = Boolean(accountDeletionPreview?.can_delete);
  const requiredDeletePhrase = accountDeletionPreview?.required_confirmation_phrase ?? "";
  const deleteSummary = accountDeletionPreview?.summary ?? [];
  const ownedOrganizations = accountDeletionPreview?.owned_organizations ?? [];

  const deleteErrorMessage = useMemo(() => {
    if (deleteError === "owner") {
      return "Não foi possível deletar: você ainda é dono de uma ou mais comunidades e precisa transferir a posse antes.";
    }
    if (deleteError === "phrase") {
      return "Frase de confirmação inválida. Copie exatamente a frase exigida.";
    }
    if (deleteError === "1") {
      return "Não foi possível deletar sua conta agora. Tente novamente.";
    }
    return null;
  }, [deleteError]);

  function toggleMultiValue(setter: Dispatch<SetStateAction<string[]>>, value: string) {
    setIsPromptSaving(false);
    setHasUnsavedChanges(true);
    setter((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
  }

  const serializedProposalContactLinks = useMemo(
    () =>
      JSON.stringify({
        email: proposalContactLinks.email.trim(),
        whatsapp: proposalContactLinks.whatsapp.trim(),
        discord: proposalContactLinks.discord.trim(),
      }),
    [proposalContactLinks]
  );

  function triggerUnsavedPrompt() {
    setShowUnsavedPrompt(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(60);
    }
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (!unsavedPromptRef.current) {
          return;
        }
        unsavedPromptRef.current.animate(
          [
            { transform: "translateX(0px)" },
            { transform: "translateX(-8px)" },
            { transform: "translateX(8px)" },
            { transform: "translateX(0px)" },
          ],
          { duration: 220, easing: "ease-in-out" }
        );
      });
    }
  }

  function handleTabChange(nextTab: TabId) {
    if (nextTab === activeTab) {
      return;
    }

    if (hasUnsavedChanges) {
      triggerUnsavedPrompt();
      return;
    }

    setActiveTab(nextTab);
  }

  function handleProfileFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (!event.currentTarget.checkValidity()) {
      setIsPromptSaving(false);
      return;
    }

    setIsPromptSaving(true);
  }

  useEffect(() => {
    if (!isPromptSaving) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsPromptSaving(false);
    }, 15000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isPromptSaving]);

  return (
    <section className="h-[80dvh] w-full pb-24 lg:pb-0">
      <Card className="h-full">
        <CardBody className="flex h-full flex-col space-y-4 overflow-hidden p-3 sm:p-4">
          {updated ? (
            <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Perfil atualizado com sucesso.
            </p>
          ) : null}

          {hasError ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {profileErrorMessage?.trim() || "Não foi possível atualizar o perfil."}
            </p>
          ) : null}

          {hasPasswordError ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível alterar a senha. Verifique os campos e tente novamente.
            </p>
          ) : null}

          {deleteErrorMessage ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteErrorMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
            <h1 className="text-base font-semibold text-[var(--color-ink)] sm:text-lg">Personalizar seu perfil</h1>
            {!isSecurityTab ? (
              <FormSubmitButton
                form={formId}
                className="h-10 px-4"
                label="Salvar perfil"
                loadingLabel="Salvando..."
                showPendingOnClick
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setShowUnsavedPrompt(false);
                }}
              />
            ) : null}
          </div>

          <div className="grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="h-full rounded-[8px] border border-black/10 bg-black/[0.02] p-2">
              <div className="grid auto-rows-max content-start gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`h-10 cursor-pointer rounded-[8px] px-3 text-left text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-[var(--color-ink)] hover:bg-black/[0.04]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 overflow-hidden rounded-[8px] border border-black/10 bg-white p-3 sm:p-4">
              {!isSecurityTab ? (
                <form
                  id={formId}
                  action="/api/auth/profile/update"
                  method="post"
                  encType="multipart/form-data"
                  className="min-h-0 flex-1 overflow-y-auto pr-1"
                  onSubmitCapture={handleProfileFormSubmit}
                  onInvalidCapture={() => setIsPromptSaving(false)}
                  onInputCapture={() => setHasUnsavedChanges(true)}
                  onChangeCapture={() => {
                    setIsPromptSaving(false);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <input type="hidden" name="redirect_locale" value={locale} />
                  <input type="hidden" name="weekly_availability_values" value={JSON.stringify(weeklyAvailability)} />
                  <input
                    type="hidden"
                    name="proposal_contact_preferences_values"
                    value={JSON.stringify(proposalContactPreferences)}
                  />
                  <input
                    type="hidden"
                    name="proposal_contact_links_values"
                    value={serializedProposalContactLinks}
                  />
                  <input type="hidden" name="has_recording_equipment" value={hasRecordingEquipment ? "1" : "0"} />
                  <input type="hidden" name="recording_equipment_values" value={JSON.stringify(recordingEquipment)} />

                  {activeTab === "conta" ? (
                    <div className="grid gap-3 sm:grid-cols-2 p-[10px]">
                      <label className="space-y-1 text-sm text-black/75">
                        <span>Nome</span>
                        <Input
                          name="name"
                          defaultValue={user.name ?? ""}
                          placeholder="Preencha com seu nome completo"
                          required
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Nome artístico</span>
                        <Input
                          name="stage_name"
                          defaultValue={user.stage_name ?? ""}
                          placeholder="Preencha com seu nome artístico"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Usuário</span>
                        <Input
                          name="username"
                          defaultValue={user.username ?? ""}
                          placeholder="Preencha com seu usuário"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>E-mail</span>
                        <Input
                          value={user.email ?? ""}
                          readOnly
                          disabled
                          title="Esse e-mail não pode ser alterado aqui. Fale com o suporte."
                          placeholder="Preencha com seu e-mail"
                          className="cursor-not-allowed bg-zinc-100 text-black/60 disabled:bg-zinc-100 disabled:text-black/60 disabled:opacity-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Estado</span>
                        <Input
                          name="state"
                          defaultValue={user.state ?? ""}
                          placeholder="Preencha com seu estado"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Cidade</span>
                        <Input
                          name="city"
                          defaultValue={user.city ?? ""}
                          placeholder="Preencha com sua cidade"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Idioma da interface</span>
                        <select
                          name="locale"
                          defaultValue={user.locale ?? locale}
                          className="h-10 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        >
                          {SUPPORTED_LOCALES.map((item) => {
                            const meta = LOCALE_META[item];
                            return (
                              <option key={item} value={item}>
                                {meta.flag} {meta.label}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <div className="space-y-1 text-sm text-black/75 sm:col-span-2">
                        <span>Membro desde</span>
                        <p className="rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.02] px-3 py-2 text-sm text-[var(--color-ink)]">
                          {formatMembershipDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "publico" ? (
                    <div className="space-y-4 p-[10px]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ImageUploadField
                          name="avatar"
                          label="Avatar"
                          recommended="800x800 (1:1)"
                          currentSrc={avatarSrc}
                          previewClassName="aspect-square w-24 sm:w-28"
                        />
                        <ImageUploadField
                          name="cover"
                          label="Banner"
                          recommended="1600x600 (8:3)"
                          currentSrc={coverSrc}
                          previewClassName="aspect-[8/3] w-full"
                        />
                      </div>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Pronomes</span>
                        <Input
                          name="pronouns"
                          defaultValue={user.pronouns ?? ""}
                          placeholder="Preencha com seus pronomes (ex.: ele/dele)"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Idiomas que você dubla</span>
                        <TagInput
                          name="dubbing_languages_values"
                          initialValues={user.dubbing_languages ?? []}
                          placeholder="Preencha com um idioma e pressione Enter"
                        />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Sotaques que consegue fazer</span>
                        <TagInput
                          name="voice_accents_values"
                          initialValues={user.voice_accents ?? []}
                          placeholder="Preencha com um sotaque e pressione Enter"
                        />
                      </label>

                      <div className="space-y-2 rounded-[8px] mt-[20px] border border-[var(--color-border-soft)] bg-black/[0.02] p-3">
                        <p className="text-sm text-black/75">Possui equipamentos?</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHasRecordingEquipment(true);
                              setHasUnsavedChanges(true);
                            }}
                            className={`h-9 cursor-pointer rounded-[8px] border px-3 text-sm font-semibold transition ${
                              hasRecordingEquipment
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-black/10 bg-white text-[var(--color-ink)] hover:bg-black/[0.03]"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHasRecordingEquipment(false);
                              setRecordingEquipment([]);
                              setHasUnsavedChanges(true);
                            }}
                            className={`h-9 cursor-pointer rounded-[8px] border px-3 text-sm font-semibold transition ${
                              !hasRecordingEquipment
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-black/10 bg-white text-[var(--color-ink)] hover:bg-black/[0.03]"
                            }`}
                          >
                            Não
                          </button>
                        </div>

                        {hasRecordingEquipment ? (
                          <div className="space-y-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {EQUIPMENT_OPTIONS.map((option) => {
                                const checked = recordingEquipment.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleMultiValue(setRecordingEquipment, option.value)}
                                    className={`h-9 cursor-pointer rounded-[8px] border px-3 text-left text-sm transition ${
                                      checked
                                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                                        : "border-black/10 bg-white text-black/75 hover:bg-black/[0.03]"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <label className="space-y-1 text-sm text-black/75">
                              <span>Outros equipamentos</span>
                              <Input
                                name="recording_equipment_other"
                                defaultValue={user.recording_equipment_other ?? ""}
                                placeholder="Preencha com outros equipamentos"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.02] p-3">
                        <p className="text-sm text-black/75">Disponibilidade semanal</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {WEEKDAY_OPTIONS.map((option) => {
                            const checked = weeklyAvailability.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleMultiValue(setWeeklyAvailability, option.value)}
                                className={`h-9 cursor-pointer rounded-[8px] border px-3 text-left text-sm transition ${
                                  checked
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                                    : "border-black/10 bg-white text-black/75 hover:bg-black/[0.03]"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-[8px] border border-[var(--color-border-soft)] bg-black/[0.02] p-3">
                        <p className="text-sm text-black/75">Forma preferida de receber proposta</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {CONTACT_PREFERENCE_OPTIONS.map((option) => {
                            const checked = proposalContactPreferences.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleMultiValue(setProposalContactPreferences, option.value)}
                                className={`h-9 cursor-pointer rounded-[8px] border px-3 text-left text-sm transition ${
                                  checked
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                                    : "border-black/10 bg-white text-black/75 hover:bg-black/[0.03]"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {proposalContactPreferences.includes("email") ? (
                          <label className="space-y-1 text-sm text-black/75">
                            <span>E-mail para propostas</span>
                            <Input
                              value={proposalContactLinks.email}
                              onChange={(event) => {
                                setProposalContactLinks((current) => ({ ...current, email: event.target.value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Preencha com o e-mail para receber propostas"
                            />
                          </label>
                        ) : null}

                        {proposalContactPreferences.includes("whatsapp") ? (
                          <label className="space-y-1 text-sm text-black/75">
                            <span>WhatsApp para propostas</span>
                            <Input
                              value={proposalContactLinks.whatsapp}
                              onChange={(event) => {
                                setProposalContactLinks((current) => ({
                                  ...current,
                                  whatsapp: formatWhatsappFieldValue(event.target.value),
                                }));
                                setIsPromptSaving(false);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Preencha com o WhatsApp (ex.: (43) 99999-9999)"
                            />
                          </label>
                        ) : null}

                        {proposalContactPreferences.includes("discord") ? (
                          <label className="space-y-1 text-sm text-black/75">
                            <span>Discord para propostas</span>
                            <Input
                              value={proposalContactLinks.discord}
                              onChange={(event) => {
                                setProposalContactLinks((current) => ({ ...current, discord: event.target.value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Preencha com o link ou usuário do Discord"
                            />
                          </label>
                        ) : null}
                      </div>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Biografia</span>
                        <textarea
                          name="bio"
                          defaultValue={user.bio ?? ""}
                          rows={4}
                          placeholder="Preencha com sua biografia"
                          className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm text-black/75">
                          <span>Habilidades</span>
                          <TagInput
                            name="skills_values"
                            initialValues={user.skills ?? []}
                            placeholder="Preencha com uma habilidade e pressione Enter"
                          />
                        </label>

                        <label className="space-y-1 text-sm text-black/75">
                          <span>Tags</span>
                          <TagInput
                            name="tags_values"
                            initialValues={user.tags ?? []}
                            placeholder="Preencha com uma tag e pressione Enter"
                          />
                        </label>
                      </div>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Histórico de dublagens</span>
                        <textarea
                          name="dubbing_history"
                          defaultValue={user.dubbing_history ?? ""}
                          rows={4}
                          placeholder="Preencha com seu histórico de dublagens"
                          className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        />
                      </label>
                    </div>
                  ) : null}
                </form>
              ) : (
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                  <section className="rounded-[10px] border border-black/10 bg-black/[0.02] p-4">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Alterar senha</p>
                    <p className="mt-1 text-xs text-black/60">
                      Ao alterar sua senha, você precisará entrar novamente.
                    </p>

                    <form action="/api/auth/change-password" method="post" className="mt-3 space-y-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="redirect_to" value={`/${locale}/perfil/editar`} />

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Senha atual</span>
                        <PasswordInput name="current_password" required placeholder="Preencha com sua senha atual" />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Nova senha</span>
                        <PasswordInput name="password" minLength={8} required placeholder="Preencha com sua nova senha" />
                      </label>

                      <label className="space-y-1 text-sm text-black/75">
                        <span>Confirmar nova senha</span>
                        <PasswordInput
                          name="password_confirmation"
                          minLength={8}
                          required
                          placeholder="Preencha com a confirmação da nova senha"
                        />
                      </label>

                      <FormSubmitButton
                        className="h-10 mt-[10px]"
                        label="Atualizar senha"
                        loadingLabel="Atualizando..."
                        showPendingOnClick
                      />
                    </form>
                  </section>

                  <section className="rounded-[10px] border border-red-200 bg-red-50/50 p-4">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAccountOpen((current) => !current)}
                      className="flex w-full cursor-pointer items-center justify-between text-left"
                      aria-expanded={isDeleteAccountOpen}
                    >
                      <span className="text-sm font-semibold text-red-700">Deletar conta</span>
                      <ChevronDown
                        size={18}
                        className={`text-red-700 transition-transform duration-200 ${isDeleteAccountOpen ? "rotate-180" : "rotate-0"}`}
                      />
                    </button>

                    {isDeleteAccountOpen ? (
                      <div className="mt-2 space-y-3">
                        <p className="text-xs text-red-700/90">
                          Esta ação é irreversível e remove seu usuário e dados vinculados no sistema.
                        </p>

                        <div className="rounded-[8px] border border-red-200 bg-white p-3 max-h-64 overflow-y-auto">
                          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Tudo que será deletado</p>
                          <ul className="mt-2 space-y-1 text-sm text-black/80">
                            {deleteSummary.map((item) => (
                              <li key={item.key} className="flex items-center justify-between gap-3">
                                <span>{item.label}</span>
                                <span className="rounded bg-black/5 px-2 py-0.5 text-xs font-semibold">{item.count}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs font-semibold text-black/70">
                            Total de registros afetados: {accountDeletionPreview?.total_items ?? 0}
                          </p>
                        </div>

                        {!canDeleteAccount ? (
                          <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <p>{accountDeletionPreview?.blocker?.message ?? "Transfira a posse das comunidades antes de deletar sua conta."}</p>
                            {ownedOrganizations.length > 0 ? (
                              <ul className="mt-2 list-disc pl-5 text-xs">
                                {ownedOrganizations.map((organization) => (
                                  <li key={organization.id}>
                                    {organization.name} ({organization.slug})
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        <form action="/api/auth/delete-account" method="post" className="space-y-2">
                          <input type="hidden" name="locale" value={locale} />

                          <label className="space-y-1 text-sm text-black/75">
                            <span>Frase obrigatória de confirmação</span>
                            <Input
                              name="confirmation_phrase"
                              required
                              placeholder={requiredDeletePhrase || "Digite a frase de confirmação"}
                              disabled={!canDeleteAccount}
                            />
                          </label>

                          <p className="text-xs text-black/60">
                            Digite exatamente: <strong>{requiredDeletePhrase || "Frase indisponível"}</strong>
                          </p>

                          <button
                            type="submit"
                            disabled={!canDeleteAccount}
                            className="inline-flex h-10 items-center rounded-[8px] bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                          >
                            Deletar minha conta
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </section>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {showUnsavedPrompt && hasUnsavedChanges && !isSecurityTab ? (
        <div className="fixed inset-x-0 bottom-[calc(40px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-3">
          <div
            ref={unsavedPromptRef}
            className="flex w-full max-w-xl items-center justify-between gap-3 rounded-[10px] border border-[var(--color-primary)]/35 bg-white px-3 py-2 shadow-[0_18px_38px_-22px_rgba(109,40,217,0.9)]"
          >
            <p className="text-xs font-semibold text-[var(--color-ink)] sm:text-sm">
              Você possui mudanças em andamento.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                form={formId}
                disabled={isPromptSaving}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--color-primary)] px-3 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-9 sm:text-sm"
              >
                {isPromptSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {isPromptSaving ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                className="inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-black/10 bg-white px-3 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-black/[0.03] sm:h-9 sm:text-sm"
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setShowUnsavedPrompt(false);
                  window.location.assign(`/${locale}/perfil/editar`);
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
