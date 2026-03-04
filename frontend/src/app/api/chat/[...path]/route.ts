import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyChatRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const cookieStore = await cookies();
  let token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const targetUrl = new URL(request.url);
  const backendUrl = `${API_BASE_URL}/chat/${path.join("/")}${targetUrl.search}`;

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const contentType = request.headers.get("content-type");
  const rawBody = hasBody ? Buffer.from(await request.arrayBuffer()) : null;

  const doRequest = async (accessToken: string) => {
    const init: RequestInit = {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      cache: "no-store",
    };

    if (rawBody) {
      init.body = rawBody;
    }

    return fetch(backendUrl, init);
  };

  let refreshedToken: string | null = null;
  let response = await doRequest(token);

  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (refreshResponse.ok) {
      const refreshPayload = (await refreshResponse.json().catch(() => ({}))) as { access_token?: string };
      if (refreshPayload.access_token) {
        refreshedToken = refreshPayload.access_token;
        token = refreshPayload.access_token;
        response = await doRequest(token);
      }
    }
  }

  const payload = await response.arrayBuffer();
  const nextResponse = new NextResponse(payload, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
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

export async function GET(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context);
}
