import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    if (wantsJson) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const payload: Record<string, unknown> = {};
  const scalarFields = [
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
  ] as const;

  for (const key of scalarFields) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim() !== "") {
      payload[key] = value.trim();
    }
  }

  if (formData.has("collaborators_payload")) {
    const collaboratorCredits = parseCollaboratorsPayload(formData.get("collaborators_payload"));
    payload.credits = collaboratorCredits;
  }

  if (formData.has("playlist_id")) {
    const rawPlaylistId = String(formData.get("playlist_id") ?? "").trim();
    payload.playlist_id = rawPlaylistId === "" ? null : rawPlaylistId;
  }

  const seasonMode = String(formData.get("season_mode") ?? "none");
  if (seasonMode === "none") {
    delete payload.season_id;
    delete payload.season_number;
    delete payload.season_title;
  } else if (seasonMode === "existing") {
    delete payload.season_number;
    delete payload.season_title;
  } else if (seasonMode === "new") {
    delete payload.season_id;
  }

  payload.allow_comments = formData.has("allow_comments");
  payload.show_likes_count = formData.has("show_likes_count");
  payload.show_views_count = formData.has("show_views_count");

  const sendUpdate = async (authToken: string) =>
    fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

  let refreshedToken: string | null = null;
  let response = await sendUpdate(token);

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
        response = await sendUpdate(token);
      }
    }
  }

  const responsePayload = await response.json().catch(() => ({
    message: "Não foi possível atualizar este episódio.",
  }));

  if (!response.ok) {
    const message = typeof responsePayload.message === "string" && responsePayload.message.trim() !== ""
      ? responsePayload.message
      : "Não foi possível atualizar este episódio.";

    if (wantsJson) {
      return NextResponse.json({ message }, { status: response.status || 400 });
    }

    const errorUrl = new URL(`/${locale}/post/${postId}/editar`, request.url);
    errorUrl.searchParams.set("error", "1");
    errorUrl.searchParams.set("error_message", message);
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  if (wantsJson) {
    const jsonResponse = NextResponse.json(responsePayload, { status: 200 });
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

  const redirectResponse = NextResponse.redirect(new URL(`/${locale}/post/${postId}?updated=1`, request.url), { status: 303 });
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
