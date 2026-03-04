import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  const url = new URL(request.url);
  const query = new URLSearchParams();

  const passthroughKeys = ["page", "per_page", "q", "visibility", "appearance"];

  for (const key of passthroughKeys) {
    const value = url.searchParams.get(key);
    if (value) {
      query.set(key, value);
    }
  }

  const list = async (authToken?: string) =>
    fetch(`${API_BASE_URL}/dubbing-tests/opportunities?${query.toString()}`, {
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(authToken ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
    });

  let refreshedToken: string | null = null;
  let response = await list(token);

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
        response = await list(token);
      }
    }
  }

  const payload = await response.json().catch(() => ({
    message: "Falha ao carregar oportunidades.",
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
