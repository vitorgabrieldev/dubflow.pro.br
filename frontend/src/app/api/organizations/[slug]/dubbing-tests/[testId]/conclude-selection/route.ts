import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string; testId: string }> }
) {
  const { slug, testId } = await context.params;
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const conclude = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/dubbing-tests/${testId}/conclude-selection`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

  let refreshedToken: string | null = null;
  let response = await conclude(token);

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
        response = await conclude(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível concluir a seleção." }));
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
