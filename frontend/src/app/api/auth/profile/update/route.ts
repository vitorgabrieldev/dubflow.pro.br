import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectLocaleRaw = String(formData.get("redirect_locale") ?? formData.get("locale") ?? "pt-BR").trim();
  const redirectLocale = redirectLocaleRaw || "pt-BR";
  const redirectTo = `/${redirectLocale}/perfil/editar`;

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${redirectLocale}/entrar`, request.url), { status: 303 });
  }

  const payload = new FormData();
  const scalarFields = [
    "name",
    "stage_name",
    "pronouns",
    "username",
    "bio",
    "website_url",
    "locale",
    "dubbing_history",
    "recording_equipment_other",
    "state",
    "city",
  ];

  for (const field of scalarFields) {
    const value = formData.get(field);
    if (typeof value === "string") {
      payload.set(field, value.trim());
    }
  }

  if (formData.has("is_private")) {
    payload.set("is_private", "1");
  }

  const skills = parseStringArrayField(formData, "skills_values", "skills_csv");
  skills.forEach((skill, index) => payload.set(`skills[${index}]`, skill));

  const dubbingLanguages = parseStringArrayField(formData, "dubbing_languages_values");
  dubbingLanguages.forEach((item, index) => payload.set(`dubbing_languages[${index}]`, item));

  const voiceAccents = parseStringArrayField(formData, "voice_accents_values");
  voiceAccents.forEach((item, index) => payload.set(`voice_accents[${index}]`, item));

  const hasRecordingEquipment = String(formData.get("has_recording_equipment") ?? "0") === "1";
  payload.set("has_recording_equipment", hasRecordingEquipment ? "1" : "0");

  const recordingEquipment = parseStringArrayField(formData, "recording_equipment_values");
  if (hasRecordingEquipment) {
    recordingEquipment.forEach((item, index) => payload.set(`recording_equipment[${index}]`, item));
  } else {
    payload.delete("recording_equipment_other");
  }

  const weeklyAvailability = parseStringArrayField(formData, "weekly_availability_values");
  weeklyAvailability.forEach((item, index) => payload.set(`weekly_availability[${index}]`, item));

  const proposalContactPreferences = parseStringArrayField(formData, "proposal_contact_preferences_values");
  proposalContactPreferences.forEach((item, index) => payload.set(`proposal_contact_preferences[${index}]`, item));
  const proposalContactLinks = parseStringRecordField(formData, "proposal_contact_links_values");
  for (const [key, value] of Object.entries(proposalContactLinks)) {
    payload.set(`proposal_contact_links[${key}]`, value);
  }

  const tags = parseStringArrayField(formData, "tags_values", "tags_csv");
  tags.forEach((tag, index) => payload.set(`tags[${index}]`, tag));

  const socialLinksByTags = parseStringArrayField(formData, "social_links_values");
  const profileLinksByTags = parseStringArrayField(formData, "profile_links_values");

  const socialLinksRaw = String(formData.get("social_links_json") ?? "").trim();
  const profileLinksRaw = String(formData.get("profile_links_json") ?? "").trim();

  if (socialLinksByTags.length > 0) {
    appendLinkArrayFromUrls(payload, "social_links", socialLinksByTags);
  } else {
    appendLinkArray(payload, "social_links", socialLinksRaw);
  }

  if (profileLinksByTags.length > 0) {
    appendLinkArrayFromUrls(payload, "profile_links", profileLinksByTags);
  } else {
    appendLinkArray(payload, "profile_links", profileLinksRaw);
  }

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    payload.set("avatar", avatar);
  }

  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    payload.set("cover", cover);
  }
  payload.set("_method", "PATCH");

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/auth/profile`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let response = await submit(token);

  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json().catch(() => ({}))) as { access_token?: string };
      if (refreshPayload.access_token) {
        refreshedToken = refreshPayload.access_token;
        token = refreshPayload.access_token;
        response = await submit(token);
      }
    }
  }

  if (!response.ok) {
    let errorMessage: string | null = null;

    try {
      const errorPayload = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (errorPayload?.errors && typeof errorPayload.errors === "object") {
        const firstFieldErrors = Object.values(errorPayload.errors).find(
          (messages): messages is string[] => Array.isArray(messages) && messages.length > 0
        );
        errorMessage = firstFieldErrors?.[0] ?? null;
      }

      if (!errorMessage && typeof errorPayload?.message === "string") {
        errorMessage = errorPayload.message;
      }

      console.error("[profile:update] API rejected profile update", {
        status: response.status,
        errorPayload,
      });
    } catch (error) {
      console.error("[profile:update] Failed to parse error response", { status: response.status, error });
      // Ignore malformed/non-JSON responses and fallback to generic error.
    }

    const errorUrl = new URL(`${redirectTo}?error=1`, request.url);
    if (errorMessage) {
      errorUrl.searchParams.set("error_message", errorMessage);
    }

    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  const nextResponse = NextResponse.redirect(new URL(`${redirectTo}?updated=1`, request.url), { status: 303 });

  if (refreshedToken) {
    nextResponse.cookies.set("ed_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return nextResponse;
}

function appendLinkArray(payload: FormData, baseField: string, raw: string) {
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Array<{ label?: string; url?: string }>;
    if (!Array.isArray(parsed)) {
      return;
    }

    parsed.forEach((link, index) => {
      const label = String(link.label ?? "").trim();
      const url = String(link.url ?? "").trim();
      if (!label || !url) {
        return;
      }
      payload.set(`${baseField}[${index}][label]`, label);
      payload.set(`${baseField}[${index}][url]`, url);
    });
  } catch {
    // Ignore malformed JSON from UI and keep current values.
  }
}

function parseStringArrayField(formData: FormData, jsonField: string, fallbackCsvField?: string) {
  const rawJson = String(formData.get(jsonField) ?? "").trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
      }
    } catch {
      // Ignore malformed JSON and fallback below.
    }
  }

  if (!fallbackCsvField) {
    return [];
  }

  return String(formData.get(fallbackCsvField) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendLinkArrayFromUrls(payload: FormData, baseField: string, urls: string[]) {
  urls.forEach((rawUrl, index) => {
    const url = rawUrl.trim();
    if (!url) {
      return;
    }

    payload.set(`${baseField}[${index}][label]`, inferLinkLabel(url));
    payload.set(`${baseField}[${index}][url]`, url);
  });
}

function parseStringRecordField(formData: FormData, jsonField: string): Record<string, string> {
  const rawJson = String(formData.get(jsonField) ?? "").trim();
  if (!rawJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = key.trim();
      const normalizedValue = String(value ?? "").trim();
      if (!normalizedKey) {
        return acc;
      }
      acc[normalizedKey] = normalizedValue;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function inferLinkLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const label = host.split(".")[0] ?? "Link";
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "Link";
  }
}
