import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // ignore logout propagation failures to backend
    }
  }

  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), { status: 303 });
  response.cookies.delete("ed_token");

  return response;
}
