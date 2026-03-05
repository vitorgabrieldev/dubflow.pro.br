import type { NotificationItem } from "@/types/api";

export type NotificationContext = "chat" | "community" | "opportunity" | "other";

export function resolveNotificationType(notification: NotificationItem): string {
  const typeFromData = typeof notification.data?.type === "string" ? notification.data.type.trim() : "";
  if (typeFromData.length > 0) {
    return typeFromData;
  }

  return notification.type ?? "generic";
}

export function resolveNotificationContext(notification: NotificationItem): NotificationContext {
  const type = resolveNotificationType(notification).toLowerCase();
  const action = typeof notification.data?.click_action === "string" ? notification.data.click_action : "";

  if (action.startsWith("/mensagens") || type.includes("chat") || type.includes("message")) {
    return "chat";
  }

  if (action.includes("/oportunidades") || type.includes("dubbing_test") || type.includes("opportunit")) {
    return "opportunity";
  }

  if (action.includes("/organizations") || type.includes("organization") || type.includes("community")) {
    return "community";
  }

  return "other";
}

export function resolveNotificationAction(locale: string, notification: NotificationItem): string | null {
  const action = notification.data?.click_action ?? null;
  if (!action) {
    return null;
  }

  if (action.startsWith("/mensagens")) {
    const metaConversationId = Number(notification.data?.meta?.conversation_id ?? 0);
    const queryConversationId = Number(action.split("c=")[1] ?? 0);
    const conversationId = queryConversationId > 0 ? queryConversationId : metaConversationId > 0 ? metaConversationId : null;
    return conversationId ? `/${locale}/mensagens?c=${conversationId}` : `/${locale}/mensagens`;
  }

  if (action.startsWith("/organizations/")) {
    return `/${locale}${action}`;
  }

  if (action.startsWith("/posts/") || action.startsWith("/post/")) {
    const postId = action.split("/")[2];
    return `/${locale}/post/${postId}`;
  }

  return `/${locale}`;
}

export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((left, right) => {
    if (Boolean(left.read_at) !== Boolean(right.read_at)) {
      return left.read_at ? 1 : -1;
    }

    const leftDate = new Date(left.created_at).getTime();
    const rightDate = new Date(right.created_at).getTime();
    return rightDate - leftDate;
  });
}

export function filterNotifications(
  items: NotificationItem[],
  options: {
    query?: string;
    type?: string;
    context?: NotificationContext | "all";
  }
): NotificationItem[] {
  const query = (options.query ?? "").trim().toLowerCase();
  const type = (options.type ?? "all").trim().toLowerCase();
  const context = options.context ?? "all";

  return items.filter((notification) => {
    const notificationType = resolveNotificationType(notification).toLowerCase();
    const notificationContext = resolveNotificationContext(notification);

    if (type !== "all" && notificationType !== type) {
      return false;
    }

    if (context !== "all" && notificationContext !== context) {
      return false;
    }

    if (!query) {
      return true;
    }

    const title = notification.data?.title?.toLowerCase() ?? "";
    const message = notification.data?.message?.toLowerCase() ?? "";
    return title.includes(query) || message.includes(query) || notificationType.includes(query);
  });
}

export function resolveNotificationIconKey(notification: NotificationItem): string {
  const icon = typeof notification.data?.icon === "string" ? notification.data.icon.trim() : "";
  if (icon) {
    return icon;
  }

  const type = resolveNotificationType(notification).toLowerCase();

  if (type.includes("chat") || type.includes("message")) {
    return "message-circle";
  }
  if (type.includes("organization") || type.includes("community")) {
    return "users-round";
  }
  if (type.includes("dubbing_test") || type.includes("opportunit")) {
    return "clapperboard";
  }
  if (type.includes("achievement")) {
    return "trophy";
  }
  if (type.includes("invite")) {
    return "user-plus";
  }
  if (type.includes("accepted") || type.includes("approved")) {
    return "check-circle-2";
  }
  if (type.includes("reject")) {
    return "x-circle";
  }

  return "bell";
}

