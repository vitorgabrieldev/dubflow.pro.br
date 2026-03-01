import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

async function proxyLike(postId: string, method: "POST" | "DELETE") {
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({
    message: "Falha ao atualizar curtida.",
  }));

  return NextResponse.json(payload, { status: response.status });
}

export async function POST(_request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  return proxyLike(postId, "POST");
}

export async function DELETE(_request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  return proxyLike(postId, "DELETE");
}
