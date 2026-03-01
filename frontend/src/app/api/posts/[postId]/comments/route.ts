import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const comment = String(body.body ?? "").trim();
  const parentIdRaw = body.parent_id;
  const parentId =
    typeof parentIdRaw === "number"
      ? parentIdRaw
      : typeof parentIdRaw === "string"
        ? Number.parseInt(parentIdRaw, 10)
        : null;

  if (!comment) {
    return NextResponse.json({ message: "Comentario vazio." }, { status: 422 });
  }

  let refreshedToken: string | null = null;
  const sendComment = async (authToken: string) =>
    fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        body: comment,
        parent_id: Number.isFinite(parentId as number) ? parentId : null,
      }),
    });

  let response = await sendComment(token);

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
        response = await sendComment(token);
      }
    }
  }

  const payload = await response.json().catch(() => ({
    message: "Falha ao enviar comentário.",
  }));

  const nextResponse = NextResponse.json(payload, {
    status: response.status,
  });

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
