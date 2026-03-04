import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const confirmationPhrase = String(formData.get("confirmation_phrase") ?? "").trim();
  const redirectTo = `/${locale}/perfil/editar`;

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  if (!confirmationPhrase) {
    return NextResponse.redirect(new URL(`${redirectTo}?delete_error=phrase`, request.url), { status: 303 });
  }

  const response = await fetch(`${API_BASE_URL}/auth/account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      confirmation_phrase: confirmationPhrase,
    }),
  });

  if (response.status === 409) {
    return NextResponse.redirect(new URL(`${redirectTo}?delete_error=owner`, request.url), { status: 303 });
  }

  if (!response.ok) {
    return NextResponse.redirect(new URL(`${redirectTo}?delete_error=1`, request.url), { status: 303 });
  }

  const nextResponse = NextResponse.redirect(new URL(`/${locale}/entrar?deleted=1`, request.url), { status: 303 });
  nextResponse.cookies.delete("ed_token");
  return nextResponse;
}
