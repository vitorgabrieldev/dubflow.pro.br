import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();

  const locale = String(formData.get("locale") ?? "pt-BR");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  const termsAccepted = String(formData.get("terms_accepted") ?? "") === "1";

  if (!name || !email || !password || !passwordConfirmation || password !== passwordConfirmation || !termsAccepted) {
    return NextResponse.redirect(new URL(`/${locale}/criar-conta?error=1`, request.url), { status: 303 });
  }

  const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      locale,
    }),
  });

  if (!registerResponse.ok) {
    return NextResponse.redirect(new URL(`/${locale}/criar-conta?error=1`, request.url), { status: 303 });
  }

  const payload = (await registerResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    return NextResponse.redirect(new URL(`/${locale}/criar-conta?error=1`, request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), { status: 303 });

  response.cookies.set("ed_token", payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: payload.expires_in ?? 60 * 60,
  });

  return response;
}
