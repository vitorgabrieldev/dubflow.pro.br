import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();

  const locale = String(formData.get("locale") ?? "pt-BR");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL(`/${locale}/entrar?error=1`, request.url), { status: 303 });
  }

  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!loginResponse.ok) {
    return NextResponse.redirect(new URL(`/${locale}/entrar?error=1`, request.url), { status: 303 });
  }

  const payload = (await loginResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar?error=1`, request.url), { status: 303 });
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
