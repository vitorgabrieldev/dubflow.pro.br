import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3030/api/v1";

type NotificationApiItem = {
  id: string;
  read_at: string | null;
  data?: {
    title?: string;
    message?: string;
  };
};

type NotificationApiResponse = {
  unread_count?: number;
  items?: {
    data?: NotificationApiItem[];
  };
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    return NextResponse.json({
      unread_count: 0,
      latest_unread: null,
    });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/notifications?per_page=10`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        unread_count: 0,
        latest_unread: null,
      });
    }

    const payload = (await response.json()) as NotificationApiResponse;
    const notifications = payload.items?.data ?? [];
    const latestUnread = notifications.find((item) => !item.read_at) ?? null;

    return NextResponse.json({
      unread_count: Number(payload.unread_count ?? 0),
      latest_unread: latestUnread
        ? {
            id: latestUnread.id,
            title: latestUnread.data?.title ?? null,
            message: latestUnread.data?.message ?? null,
          }
        : null,
    });
  } catch {
    return NextResponse.json({
      unread_count: 0,
      latest_unread: null,
    });
  }
}
