import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const decision = String(formData.get("decision") ?? "").trim();
  const notificationId = String(formData.get("notification_id") ?? "").trim();

  if (decision !== "accept" && decision !== "reject") {
    return NextResponse.redirect(new URL(`/${locale}/notificacoes?owner_transfer=error`, request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/owner-transfer/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        decision,
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

  if (response.ok && notificationId) {
    await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined);
  }

  const queryValue = response.ok ? decision : "error";
  const nextResponse = NextResponse.redirect(new URL(`/${locale}/notificacoes?owner_transfer=${queryValue}`, request.url), {
    status: 303,
  });

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

