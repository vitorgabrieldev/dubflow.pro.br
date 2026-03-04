import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type MePayload = {
  user?: unknown;
};

type RefreshPayload = {
  access_token?: string;
  expires_in?: number;
  user?: unknown;
};

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value ?? "";

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const loadMe = async (currentToken: string) => {
    return fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      cache: "no-store",
    });
  };

  let response: Response | null = null;
  try {
    response = await loadMe(token);
  } catch {
    return NextResponse.json({ message: "Sessão temporariamente indisponível." }, { status: 503 });
  }

  let user: unknown = null;
  let refreshedToken: string | null = null;
  let refreshedTokenMaxAge: number | null = null;
  let mustInvalidateCookie = false;

  if (response?.ok) {
    const payload = (await response.json().catch(() => ({}))) as MePayload;
    user = payload.user ?? null;
  } else if (response?.status === 401) {
    mustInvalidateCookie = true;

    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);

    if (refreshResponse?.ok) {
      const refreshPayload = (await refreshResponse.json().catch(() => ({}))) as RefreshPayload;
      if (typeof refreshPayload.access_token === "string" && refreshPayload.access_token.trim().length > 0) {
        token = refreshPayload.access_token;
        refreshedToken = refreshPayload.access_token;
        refreshedTokenMaxAge = Number.isFinite(Number(refreshPayload.expires_in)) ? Number(refreshPayload.expires_in) : null;
      }

      user = refreshPayload.user ?? null;
      if (!user && token) {
        try {
          response = await loadMe(token);
        } catch {
          response = null;
        }

        if (response?.ok) {
          const payload = (await response.json().catch(() => ({}))) as MePayload;
          user = payload.user ?? null;
        }
      }

      if (user) {
        mustInvalidateCookie = false;
      }
    }
  } else {
    return NextResponse.json({ message: "Não foi possível validar sessão agora." }, { status: response?.status || 503 });
  }

  if (!user) {
    if (!mustInvalidateCookie) {
      return NextResponse.json({ message: "Não foi possível validar sessão agora." }, { status: 503 });
    }

    const unauthorized = NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
    unauthorized.cookies.delete("ed_token");
    return unauthorized;
  }

  const ok = NextResponse.json({ user }, { status: 200 });
  if (refreshedToken) {
    ok.cookies.set("ed_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshedTokenMaxAge ?? 60 * 60,
    });
  }

  return ok;
}
