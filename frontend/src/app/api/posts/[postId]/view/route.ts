import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const watchSecondsRaw = Number(body.watch_seconds ?? 0);
  const watchSeconds = Number.isFinite(watchSecondsRaw) ? Math.max(0, Math.floor(watchSecondsRaw)) : 0;

  const response = await fetch(`${API_BASE_URL}/posts/${postId}/view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      watch_seconds: watchSeconds,
    }),
  });

  const payload = await response.json().catch(() => ({
    message: "Falha ao registrar visualização.",
  }));

  return NextResponse.json(payload, { status: response.status });
}

