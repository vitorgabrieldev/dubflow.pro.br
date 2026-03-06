import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "pt-BR";
  return NextResponse.redirect(new URL(`/${locale}/publicar`, request.url), { status: 307 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const publishTargetRaw = String(formData.get("publish_target") ?? "community").trim().toLowerCase();
  const publishTarget = publishTargetRaw === "profile" ? "profile" : "community";
  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  if (publishTarget !== "profile" && !organizationSlug) {
    const message = "Selecione uma comunidade para publicar.";
    if (wantsJson) {
      return NextResponse.json({ message }, { status: 422 });
    }
    return redirectWithPostError(request.url, locale, message);
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    const message = "Não autenticado.";
    if (wantsJson) {
      return NextResponse.json({ message }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const payload = new FormData();

  const passthroughKeys = [
    "title",
    "description",
    "playlist_id",
    "season_id",
    "season_number",
    "season_title",
    "duration_seconds",
    "visibility",
    "language_code",
    "work_title",
    "content_license",
    "show_likes_count",
    "show_views_count",
  ];

  for (const key of passthroughKeys) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim() !== "") {
      payload.set(key, value.trim());
    }
  }

  const collaboratorCredits = parseCollaboratorsPayload(formData.get("collaborators_payload"));
  collaboratorCredits.forEach((credit, index) => {
    payload.append(`credits[${index}][character_name]`, credit.character_name);
    if (credit.dubber_user_id !== null) {
      payload.append(`credits[${index}][dubber_user_id]`, String(credit.dubber_user_id));
    }
    if (credit.dubber_name) {
      payload.append(`credits[${index}][dubber_name]`, credit.dubber_name);
    }
  });

  payload.set("allow_comments", formData.has("allow_comments") ? "1" : "0");
  payload.set("show_likes_count", formData.has("show_likes_count") ? "1" : "0");
  payload.set("show_views_count", formData.has("show_views_count") ? "1" : "0");

  const mediaAssets = formData.getAll("media_assets[]").filter((asset): asset is File => asset instanceof File && asset.size > 0);

  if (mediaAssets.length > 40) {
    const message = "Você pode enviar no máximo 40 arquivos por episódio.";
    if (wantsJson) {
      return NextResponse.json({ message }, { status: 422 });
    }
    return redirectWithPostError(request.url, locale, message);
  }

  if (mediaAssets.length > 0) {
    for (const asset of mediaAssets) {
      payload.append("media_assets[]", asset);
    }
  } else {
    const media = formData.get("media");
    if (media instanceof File && media.size > 0) {
      payload.set("media", media);
    }
  }

  const hasMedia = payload.has("media") || payload.has("media_assets[]");
  if (!hasMedia) {
    const message = "Adicione ao menos uma mídia para publicar o episódio.";
    if (wantsJson) {
      return NextResponse.json({ message }, { status: 422 });
    }
    return redirectWithPostError(request.url, locale, message);
  }

  const thumbnail = formData.get("thumbnail");
  if (thumbnail instanceof File && thumbnail.size > 0) {
    payload.set("thumbnail", thumbnail);
  }

  let refreshedToken: string | null = null;
  const publish = async (authToken: string) =>
    fetch(
      publishTarget === "profile"
        ? `${API_BASE_URL}/posts/profile`
        : `${API_BASE_URL}/organizations/${organizationSlug}/posts`,
      {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let response = await publish(token);

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
        response = await publish(token);
      }
    }
  }

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detailedMessage = extractApiMessage(responsePayload);
    const message =
      response.status === 401
        ? "Sessão expirada. Faça login novamente."
        : detailedMessage ?? "Não foi possível publicar o episódio.";

    if (wantsJson) {
      return NextResponse.json({ message }, { status: response.status });
    }

    return redirectWithPostError(request.url, locale, message);
  }

  if (wantsJson) {
    const jsonResponse = NextResponse.json(responsePayload, { status: 201 });
    if (refreshedToken) {
      jsonResponse.cookies.set("ed_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
    }
    return jsonResponse;
  }

  const createdPostId = extractCreatedPostId(responsePayload);
  const redirectTarget = createdPostId ? `/${locale}/post/${createdPostId}` : `/${locale}/publicar?post_created=1`;
  const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url), { status: 303 });

  if (refreshedToken) {
    redirectResponse.cookies.set("ed_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return redirectResponse;
}

function redirectWithPostError(requestUrl: string, locale: string, message: string) {
  const url = new URL(`/${locale}/publicar`, requestUrl);
  url.searchParams.set("post_error", "1");
  url.searchParams.set("post_error_message", message);
  return NextResponse.redirect(url, { status: 303 });
}

function extractApiMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const asMessage = payload as { message?: unknown; errors?: unknown };
  if (typeof asMessage.message === "string" && asMessage.message.trim()) {
    return asMessage.message;
  }

  if (!asMessage.errors || typeof asMessage.errors !== "object") {
    return null;
  }

  for (const value of Object.values(asMessage.errors as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string" && first.trim()) {
        return first;
      }
    }
  }

  return null;
}

function extractCreatedPostId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const post = (payload as { post?: unknown }).post;
  if (!post || typeof post !== "object") {
    return null;
  }

  const id = (post as { id?: unknown }).id;
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }

  if (typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))) {
    return Number(id);
  }

  return null;
}

type CollaboratorCreditPayload = {
  character_name: string;
  dubber_user_id: number | null;
  dubber_name: string | null;
};

function parseCollaboratorsPayload(rawValue: FormDataEntryValue | null): CollaboratorCreditPayload[] {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const credits: CollaboratorCreditPayload[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const role = typeof (item as { role?: unknown }).role === "string" ? (item as { role: string }).role.trim() : "";
    const people = Array.isArray((item as { people?: unknown }).people) ? ((item as { people: unknown[] }).people as unknown[]) : [];

    if (!role || people.length === 0) {
      continue;
    }

    for (const person of people) {
      if (!person || typeof person !== "object") {
        continue;
      }

      const label = typeof (person as { label?: unknown }).label === "string" ? (person as { label: string }).label.trim() : "";
      if (!label) {
        continue;
      }

      const rawUserId = (person as { user_id?: unknown }).user_id;
      const userId = typeof rawUserId === "number" && Number.isFinite(rawUserId) ? rawUserId : null;

      credits.push({
        character_name: role,
        dubber_user_id: userId,
        dubber_name: label,
      });
    }
  }

  return credits.slice(0, 200);
}
