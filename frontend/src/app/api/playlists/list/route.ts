import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = new URLSearchParams();

  const passthroughKeys = ["page", "per_page", "q", "sort", "organization", "user"];

  for (const key of passthroughKeys) {
    const value = url.searchParams.get(key);
    if (value) {
      query.set(key, value);
    }
  }

  query.set("visibility", "public");

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  const response = await fetch(`${API_BASE_URL}/playlists?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });

  const payload = await response.json().catch(() => ({
    message: "Falha ao carregar playlists.",
  }));

  return NextResponse.json(payload, {
    status: response.status,
  });
}
