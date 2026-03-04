import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationSlug: string; playlistId: string }> }
) {
  const { organizationSlug, playlistId } = await context.params;
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "pt-BR");
  const redirectTo = String(
    formData.get("redirect_to") ?? `/${locale}/playlists/${organizationSlug}/${playlistId}`
  );

  const seasonNumber = Number(formData.get("season_number") ?? 0);
  const title = String(formData.get("title") ?? "").trim();

  if (!seasonNumber || Number.isNaN(seasonNumber) || seasonNumber < 1) {
    return NextResponse.redirect(new URL(`${redirectTo}?season_error=1`, request.url), { status: 303 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/entrar`, request.url), { status: 303 });
  }

  const response = await fetch(
    `${API_BASE_URL}/organizations/${organizationSlug}/playlists/${playlistId}/seasons`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        season_number: seasonNumber,
        title: title || null,
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.redirect(new URL(`${redirectTo}?season_error=1`, request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`${redirectTo}?season_created=1`, request.url), { status: 303 });
}
