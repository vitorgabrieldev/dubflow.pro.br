import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const formData = await request.formData();

  const locale = String(formData.get("locale") ?? "pt-BR");
  const redirectTo = String(formData.get("redirect_to") ?? `/${locale}/comunidades`);

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const response = await fetch(`${API_BASE_URL}/organizations/${slug}/join-request`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const url = new URL(redirectTo, request.url);
  url.searchParams.set(response.ok ? "joined" : "join_error", "1");

  return NextResponse.redirect(url, { status: 303 });
}
