import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EditProfileTabsForm } from "@/components/profile/edit-profile-tabs-form";
import { fetchCurrentUser, resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

type AuthMeResponse = {
  user?: {
    name?: string;
    stage_name?: string | null;
    pronouns?: string | null;
    username?: string | null;
    email?: string | null;
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
    avatar_path?: string | null;
    cover_path?: string | null;
    tags?: string[];
    dubbing_history?: string | null;
  };
};

type AccountDeletionPreview = {
  can_delete?: boolean;
  required_confirmation_phrase?: string;
  blocker?: { code?: string; message?: string } | null;
  owned_organizations?: Array<{ id: number; name: string; slug: string }>;
  summary?: Array<{ key: string; label: string; count: number }>;
  total_items?: number;
};

export default async function EditProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ updated?: string; error?: string; error_message?: string; password_error?: string; delete_error?: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const me = await fetchCurrentUser(token);
  if (!me) {
    redirect(`/${locale}/entrar`);
  }

  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  const detailResponse = await fetch(`${apiBase}/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const detailPayload = detailResponse.ok ? ((await detailResponse.json()) as AuthMeResponse) : {};
  const user = detailPayload.user ?? {};

  const deletePreviewResponse = await fetch(`${apiBase}/auth/account/deletion-preview`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const deletePreview = deletePreviewResponse.ok
    ? ((await deletePreviewResponse.json()) as AccountDeletionPreview)
    : null;

  return (
    <EditProfileTabsForm
      locale={locale}
      user={user}
      updated={query.updated === "1"}
      hasError={query.error === "1"}
      profileErrorMessage={query.error_message ?? null}
      hasPasswordError={query.password_error === "1"}
      deleteError={query.delete_error ?? null}
      accountDeletionPreview={deletePreview}
      coverSrc={resolveMediaUrl(user.cover_path)}
      avatarSrc={resolveMediaUrl(user.avatar_path)}
    />
  );
}
