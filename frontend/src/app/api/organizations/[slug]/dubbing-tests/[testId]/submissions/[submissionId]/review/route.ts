import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; testId: string; submissionId: string }> }
) {
  const { slug, testId, submissionId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: "approved" | "reserve" | "rejected";
  };

  if (!body.status) {
    return NextResponse.json({ message: "Status inválido." }, { status: 422 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = JSON.stringify({ status: body.status });

  const review = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/dubbing-tests/${testId}/submissions/${submissionId}/review`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let refreshedToken: string | null = null;
  let response = await review(token);

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
        response = await review(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível revisar a inscrição." }));
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
