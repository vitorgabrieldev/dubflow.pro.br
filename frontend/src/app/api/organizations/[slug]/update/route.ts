import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const redirectTo = `/${locale}/organizations/${slug}/editar`;

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const payload = new FormData();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return NextResponse.redirect(new URL(`${redirectTo}?error=1`, request.url), { status: 303 });
  }

  payload.set("name", name);
  payload.set("description", String(formData.get("description") ?? "").trim());
  payload.set("website_url", String(formData.get("website_url") ?? "").trim());
  payload.set("is_public", formData.has("is_public") ? "1" : "0");

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    payload.set("avatar", avatar);
  }

  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    payload.set("cover", cover);
  }

  payload.set("_method", "PATCH");

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}`, {
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

  if (!response.ok) {
    return NextResponse.redirect(new URL(`${redirectTo}?error=1`, request.url), { status: 303 });
  }

  const nextResponse = NextResponse.redirect(new URL(`${redirectTo}?updated=1`, request.url), { status: 303 });

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
