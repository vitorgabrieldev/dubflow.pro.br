import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const rawRedirectTo = String(formData.get("redirect_to") ?? "").trim();
  const fallbackRedirectTo = `/${locale}/alterar-senha`;
  const redirectTo =
    rawRedirectTo.startsWith(`/${locale}/`) && !rawRedirectTo.includes("://")
      ? rawRedirectTo
      : fallbackRedirectTo;
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (!currentPassword || !password || !passwordConfirmation || password !== passwordConfirmation) {
    return NextResponse.redirect(new URL(`${redirectTo}?password_error=1`, request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL(`${redirectTo}?password_error=1`, request.url), { status: 303 });
  }

  const redirectResponse = NextResponse.redirect(new URL(`/${locale}/entrar?changed=1`, request.url), { status: 303 });
  redirectResponse.cookies.delete("ed_token");
  return redirectResponse;
}
