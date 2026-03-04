import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "8");
  const perPage = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 8;

  if (query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const search = new URLSearchParams({
    q: query,
    per_page: String(perPage),
  });

  const response = await fetch(`${API_BASE_URL}/search?${search.toString()}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as { users?: unknown; message?: string };
  if (!response.ok) {
    return NextResponse.json(
      {
        message: typeof payload.message === "string" ? payload.message : "Não foi possível buscar usuários.",
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    users: Array.isArray(payload.users) ? payload.users.slice(0, perPage) : [],
  });
}
