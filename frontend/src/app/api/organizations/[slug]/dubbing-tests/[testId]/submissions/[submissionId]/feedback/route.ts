import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; testId: string; submissionId: string }> }
) {
  const { slug, testId, submissionId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { rejection_feedback?: string };

  if (!body.rejection_feedback || body.rejection_feedback.trim().length === 0) {
    return NextResponse.json({ message: "Feedback inválido." }, { status: 422 });
  }

  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = JSON.stringify({ rejection_feedback: body.rejection_feedback.trim() });

  const saveFeedback = async (authToken: string) =>
    fetch(`${API_BASE_URL}/organizations/${slug}/dubbing-tests/${testId}/submissions/${submissionId}/feedback`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

  let refreshedToken: string | null = null;
  let response = await saveFeedback(token);

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
        response = await saveFeedback(token);
      }
    }
  }

  const result = await response.json().catch(() => ({ message: "Não foi possível salvar o feedback." }));
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
