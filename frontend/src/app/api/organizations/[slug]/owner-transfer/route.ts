import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { target_user_id?: number };
  const targetUserId = Number(body.target_user_id);

  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ message: "Membro inválido para transferência." }, { status: 422 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let refreshedToken: string | null = null;

  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/owner-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        target_user_id: targetUserId,
      }),
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

  const payload = await response.json().catch(() => ({
    message: "Falha ao solicitar transferência de propriedade.",
  }));

  const nextResponse = NextResponse.json(payload, { status: response.status });
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

