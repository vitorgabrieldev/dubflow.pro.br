import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const formData = await request.formData();

  const locale = String(formData.get("locale") ?? "pt-BR");
  const decision = String(formData.get("decision") ?? "").trim();
  const notificationId = String(formData.get("notification_id") ?? "").trim();

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  if (decision !== "accept" && decision !== "reject") {
    return NextResponse.redirect(new URL(`/${locale}/notificacoes?invite=error`, request.url), { status: 303 });
  }

  const endpoint = decision === "accept" ? "accept" : "reject";

  const submitDecision = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/members/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

  let refreshedToken: string | null = null;
  let response = await submitDecision(token);

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
        response = await submitDecision(token);
      }
    }
  }

  if (response.ok && notificationId) {
    const notificationMethod = decision === "reject" ? "DELETE" : "POST";
    const notificationEndpoint =
      decision === "reject"
        ? `${API_BASE_URL}/notifications/${notificationId}`
        : `${API_BASE_URL}/notifications/${notificationId}/invite-accepted`;

    await fetch(notificationEndpoint, {
      method: notificationMethod,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined);
  }

  const queryValue = response.ok ? decision : "error";
  const nextResponse = NextResponse.redirect(new URL(`/${locale}/notificacoes?invite=${queryValue}`, request.url), {
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
