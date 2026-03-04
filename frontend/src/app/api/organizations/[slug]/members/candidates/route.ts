import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ users: [] }, { status: 401 });
  }

  const requestCandidates = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/member-candidates?q=${encodeURIComponent(q)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });

  let refreshedToken: string | null = null;
  let response = await requestCandidates(token);

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
        response = await requestCandidates(token);
      }
    }
  }

  const payload = await response.json().catch(() => ({ users: [] }));
  const nextResponse = NextResponse.json(payload, { status: response.status });

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
