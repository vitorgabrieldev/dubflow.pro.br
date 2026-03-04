import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return NextResponse.redirect(new URL(`/${locale}/recuperar-senha?error=1`, request.url), { status: 303 });
  }

  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    reset_token?: string;
    reset_link?: string;
  };

  if (!response.ok) {
    return NextResponse.redirect(new URL(`/${locale}/recuperar-senha?error=1`, request.url), { status: 303 });
  }

  const redirectUrl = new URL(`/${locale}/recuperar-senha?sent=1`, request.url);
  if (payload.reset_token) {
    redirectUrl.searchParams.set("debug_token", payload.reset_token);
    redirectUrl.searchParams.set("debug_email", email);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

