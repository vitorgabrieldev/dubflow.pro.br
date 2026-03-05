import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { filterNotifications, sortNotifications, type NotificationContext } from "@/lib/notifications";
import type { NotificationItem } from "@/types/api";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type NotificationApiResponse = {
  unread_count?: number;
  items?: {
    data?: NotificationItem[];
  };
};

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({
      unread_count: 0,
      items: [],
      total: 0,
    });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(80, Number(url.searchParams.get("limit") ?? 20)));
  const query = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type") ?? "all";
  const context = (url.searchParams.get("context") ?? "all") as NotificationContext | "all";

  try {
    const response = await fetch(`${API_BASE_URL}/notifications?per_page=80`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        unread_count: 0,
        items: [],
        total: 0,
      });
    }

    const payload = (await response.json()) as NotificationApiResponse;
    const rawItems = payload.items?.data ?? [];
    const filtered = filterNotifications(sortNotifications(rawItems), {
      query,
      type,
      context,
    });

    return NextResponse.json({
      unread_count: Number(payload.unread_count ?? 0),
      items: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch {
    return NextResponse.json({
      unread_count: 0,
      items: [],
      total: 0,
    });
  }
}

