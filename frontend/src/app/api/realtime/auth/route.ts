import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

function resolveBroadcastAuthUrl() {
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiOrigin}/api/broadcasting/auth`;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "application/x-www-form-urlencoded";
  const rawBody = Buffer.from(await request.arrayBuffer());

  const response = await fetch(resolveBroadcastAuthUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: rawBody,
    cache: "no-store",
  });

  const payload = await response.arrayBuffer();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
