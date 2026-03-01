import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(
  request: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await context.params;
  const formData = await request.formData();

  const locale = String(formData.get("locale") ?? "pt-BR");
  const redirectTo = String(formData.get("redirect_to") ?? `/${locale}/notificacoes`);

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);

  return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
}
