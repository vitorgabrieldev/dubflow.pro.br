import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(_request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 15 } }),
  });

  const payload = await response.json().catch(() => ({
    message: "Falha ao carregar o post.",
  }));

  return NextResponse.json(payload, {
    status: response.status,
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let refreshedToken: string | null = null;
  const submit = async (authToken: string) =>
    fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

  let response = await submit(token);

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
        response = await submit(token);
      }
    }
  }

  const payload = await response.json().catch(() => ({
    message: "Falha ao excluir o post.",
  }));

  if (response.status === 404) {
    const notFoundResponse = NextResponse.json(
      {
        message: "Este episódio já foi removido.",
        already_deleted: true,
      },
      { status: 404 }
    );

    if (refreshedToken) {
      notFoundResponse.cookies.set("ed_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
    }

    return notFoundResponse;
  }

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
