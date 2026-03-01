import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "pt-BR";
  return NextResponse.redirect(new URL(`/${locale}/nova-playlist`, request.url), { status: 307 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workTitle = String(formData.get("work_title") ?? "").trim();
  const releaseYear = String(formData.get("release_year") ?? "").trim();
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  if (!organizationSlug || !title || !releaseYear) {
    if (wantsJson) {
      return NextResponse.json({ message: "Comunidade, título e ano são obrigatórios." }, { status: 422 });
    }

    return NextResponse.redirect(new URL(`/${locale}/nova-playlist?error=1`, request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    if (wantsJson) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const payload = {
    title,
    description: description || null,
    work_title: workTitle || null,
    release_year: Number.parseInt(releaseYear, 10),
  };

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${organizationSlug}/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
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

  const responsePayload = (await response.json().catch(() => ({}))) as {
    message?: string;
    playlist?: { id: number; slug: string };
  };

  if (!response.ok || !responsePayload.playlist) {
    const message =
      response.status === 401
        ? "Sessão expirada. Faça login novamente."
        : responsePayload.message ?? "Não foi possível criar a playlist.";

    if (wantsJson) {
      return NextResponse.json({ message }, { status: response.status || 400 });
    }

    return NextResponse.redirect(new URL(`/${locale}/nova-playlist?error=1`, request.url), { status: 303 });
  }

  const payloadWithOrganization = {
    ...responsePayload,
    organization_slug: organizationSlug,
  };

  if (wantsJson) {
    const jsonResponse = NextResponse.json(payloadWithOrganization, { status: 201 });
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

  const redirectResponse = NextResponse.redirect(new URL(`/${locale}/nova-playlist?created=1`, request.url), { status: 303 });
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
