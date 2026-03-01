import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

type CharacterInput = {
  name: string;
  description?: string;
  expectations?: string;
  appearance_estimate: "protagonista" | "coadjuvante" | "pontas" | "figurante" | "voz_adicional";
};

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const resultsReleaseAt = String(formData.get("results_release_at") ?? "").trim();
  const charactersRaw = String(formData.get("characters_json") ?? "[]");

  let characters: CharacterInput[] = [];
  try {
    const parsed = JSON.parse(charactersRaw) as CharacterInput[];
    if (Array.isArray(parsed)) {
      characters = parsed;
    }
  } catch {
    characters = [];
  }

  if (!title || !visibility || !startsAt || !endsAt || !resultsReleaseAt || characters.length === 0) {
    return NextResponse.json({ message: "Preencha todos os campos obrigatórios do teste." }, { status: 422 });
  }

  const mediaFiles = formData
    .getAll("media_files[]")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const payload = new FormData();
  payload.set("title", title);
  payload.set("description", description);
  payload.set("visibility", visibility);
  if (status) {
    payload.set("status", status);
  }
  payload.set("starts_at", startsAt);
  payload.set("ends_at", endsAt);
  payload.set("results_release_at", resultsReleaseAt);

  characters.forEach((character, index) => {
    payload.set(`characters[${index}][name]`, character.name?.trim() ?? "");
    payload.set(`characters[${index}][appearance_estimate]`, character.appearance_estimate);

    if (character.description?.trim()) {
      payload.set(`characters[${index}][description]`, character.description.trim());
    }

    if (character.expectations?.trim()) {
      payload.set(`characters[${index}][expectations]`, character.expectations.trim());
    }
  });

  for (const file of mediaFiles) {
    payload.append("media[]", file);
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const create = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/dubbing-tests`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let refreshedToken: string | null = null;
  let response = await create(token);

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
        response = await create(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível criar o teste." }));
  const nextResponse = NextResponse.json(result, { status: response.status });

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
