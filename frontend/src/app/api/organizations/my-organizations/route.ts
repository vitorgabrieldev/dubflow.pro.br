import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const perPage = Number(url.searchParams.get("per_page") ?? "50");
  const normalizedPerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 100) : 50;

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/my-organizations?per_page=${normalizedPerPage}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({
    message: "Não foi possível carregar suas comunidades.",
  }));

  return NextResponse.json(payload, {
    status: response.status,
  });
}
