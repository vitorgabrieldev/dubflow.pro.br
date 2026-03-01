import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; testId: string }> }
) {
  const { slug, testId } = await context.params;
  const url = new URL(request.url);
  const page = url.searchParams.get("page") ?? "1";
  const perPage = url.searchParams.get("per_page") ?? "30";

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const list = async (authToken: string) =>
    fetch(
      `${API_BASE_URL}/organizations/${slug}/dubbing-tests/${testId}/submissions?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        cache: "no-store",
      }
    );

  let refreshedToken: string | null = null;
  let response = await list(token);

  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json().catch(() => ({}))) as { access_token?: string };
      if (refreshPayload.access_token) {
        refreshedToken = refreshPayload.access_token;
        token = refreshPayload.access_token;
        response = await list(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível listar inscrições." }));
  const nextResponse = NextResponse.json(result, { status: response.status });

  if (refreshedToken) {
    nextResponse.cookies.set("ed_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return nextResponse;
}
