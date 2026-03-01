import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (!token || !email || !password || !passwordConfirmation || password !== passwordConfirmation) {
    return NextResponse.redirect(
      new URL(`/${locale}/redefinir-senha?error=1&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, request.url),
      { status: 303 }
    );
  }

  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  if (!response.ok) {
    return NextResponse.redirect(
      new URL(`/${locale}/redefinir-senha?error=1&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, request.url),
      { status: 303 }
    );
  }

  return NextResponse.redirect(new URL(`/${locale}/entrar?reset=1`, request.url), { status: 303 });
}

