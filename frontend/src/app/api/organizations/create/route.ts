import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "pt-BR";
  return NextResponse.redirect(new URL(`/${locale}/nova-organizacao`, request.url), { status: 307 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPublic = String(formData.get("is_public") ?? "1") === "1";

  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  if (!name) {
    if (wantsJson) {
      return NextResponse.json({ message: "Nome da comunidade é obrigatório." }, { status: 422 });
    }
    return NextResponse.redirect(new URL(`/${locale}/publicar?org_error=1`, request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    if (wantsJson) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const payload = new FormData();
  payload.set("name", name);
  payload.set("description", description);
  payload.set("is_public", isPublic ? "1" : "0");

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    payload.set("avatar", avatar);
  }

  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    payload.set("cover", cover);
  }

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations`, {
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

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Sessão expirada. Faça login novamente."
        : (responsePayload as { message?: string }).message ?? "Não foi possível criar a comunidade.";

    if (wantsJson) {
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.redirect(new URL(`/${locale}/publicar?org_error=1`, request.url), { status: 303 });
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

  const redirectResponse = NextResponse.redirect(new URL(`/${locale}/publicar?org_created=1`, request.url), { status: 303 });

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
