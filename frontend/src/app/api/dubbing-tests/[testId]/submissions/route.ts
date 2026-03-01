import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request, context: { params: Promise<{ testId: string }> }) {
  const { testId } = await context.params;
  const formData = await request.formData();

  const characterId = String(formData.get("character_id") ?? "").trim();
  const coverLetter = String(formData.get("cover_letter") ?? "").trim();
  const mediaFiles = formData
    .getAll("media_files[]")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!characterId || !coverLetter || mediaFiles.length === 0) {
    return NextResponse.json(
      { message: "Personagem, texto e ao menos uma mídia são obrigatórios." },
      { status: 422 }
    );
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = new FormData();
  payload.set("character_id", characterId);
  payload.set("cover_letter", coverLetter);

  for (const file of mediaFiles) {
    payload.append("media[]", file);
  }

  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/dubbing-tests/${testId}/submissions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let refreshedToken: string | null = null;
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
      const refreshPayload = (await refreshResponse.json().catch(() => ({}))) as {
        access_token?: string;
      };

      if (refreshPayload.access_token) {
        refreshedToken = refreshPayload.access_token;
        token = refreshPayload.access_token;
        response = await submit(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível enviar inscrição." }));
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
