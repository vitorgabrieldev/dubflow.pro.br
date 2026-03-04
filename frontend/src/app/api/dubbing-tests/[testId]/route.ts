import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(request: Request, context: { params: Promise<{ testId: string }> }) {
  const { testId } = await context.params;
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  const load = async (authToken?: string) =>
    fetch(`${API_BASE_URL}/dubbing-tests/${testId}`, {
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(authToken ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    });

  let refreshedToken: string | null = null;
  let response = await load(token);

  if (token && response.status === 401) {
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
        response = await load(token);
      }
    }
  }

  const payload = await response.json().catch(() => ({ message: "Falha ao carregar oportunidade." }));
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
