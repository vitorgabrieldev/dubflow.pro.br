import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clapperboard,
  Menu,
  MessageCircle,
  Trash2,
  Trophy,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { fetchNotifications } from "@/lib/api";
import {
  filterNotifications,
  resolveNotificationAction,
  resolveNotificationContext,
  resolveNotificationIconKey,
  resolveNotificationType,
  sortNotifications,
  type NotificationContext,
} from "@/lib/notifications";
import { isLocale } from "@/lib/i18n";
import type { NotificationItem } from "@/types/api";

type NotificationsPageSearch = {
  invite?: string;
  owner_transfer?: string;
  q?: string;
  type?: string;
  context?: NotificationContext | "all";
};

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<NotificationsPageSearch>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const payload = await fetchNotifications(token);

  if (!payload) {
    return <p className="text-sm text-black/65">Não foi possível carregar notificações agora.</p>;
  }

  const searchText = (query.q ?? "").trim();
  const contextFilter = query.context ?? "all";
  const sortedNotifications = sortNotifications(payload.items.data);
  const typeOptions = Array.from(new Set(sortedNotifications.map((notification) => resolveNotificationType(notification)))).sort(
    (left, right) => left.localeCompare(right)
  );

  const typeFilter = query.type && typeOptions.includes(query.type) ? query.type : "all";
  const filteredNotifications = filterNotifications(sortedNotifications, {
    query: searchText,
    type: typeFilter,
    context: contextFilter,
  });

  const currentSearchParams = new URLSearchParams();
  if (searchText.length > 0) {
    currentSearchParams.set("q", searchText);
  }
  if (typeFilter !== "all") {
    currentSearchParams.set("type", typeFilter);
  }
  if (contextFilter !== "all") {
    currentSearchParams.set("context", contextFilter);
  }

  const redirectPath = `/${locale}/notificacoes${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ""}`;

  const groupedByContext = groupNotificationsByContext(filteredNotifications);
  const visibleGroups = (["chat", "community", "opportunity", "other"] as NotificationContext[]).filter(
    (groupKey) => groupedByContext[groupKey].length > 0
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
          <Bell size={16} />
          Notificações
        </p>

        <details className="relative">
          <summary className="inline-flex h-9 list-none cursor-pointer items-center gap-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
            <Menu size={14} />
            Ações
          </summary>

          <div className="absolute right-0 top-11 z-10 w-44 overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-white p-1 shadow-lg">
            <form action="/api/notifications/read-all" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-black/75 hover:bg-black/5"
              >
                <CheckCheck size={12} />
                Ler todas
              </button>
            </form>

            <form action="/api/notifications/clear" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 size={12} />
                Limpar todas
              </button>
            </form>
          </div>
        </details>
      </header>

      <form action={`/${locale}/notificacoes`} method="get" className="grid gap-2 sm:grid-cols-3">
        <input
          type="search"
          name="q"
          defaultValue={searchText}
          placeholder="Buscar notificação..."
          className="h-10 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />

        <select
          name="context"
          defaultValue={contextFilter}
          className="h-10 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
        >
          <option value="all">Todos contextos</option>
          <option value="chat">Chat</option>
          <option value="community">Comunidade</option>
          <option value="opportunity">Oportunidade</option>
          <option value="other">Outros</option>
        </select>

        <div className="flex items-center gap-2">
          <select
            name="type"
            defaultValue={typeFilter}
            className="h-10 min-w-0 flex-1 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
          >
            <option value="all">Todos tipos</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5"
          >
            Filtrar
          </button>
        </div>
      </form>

      {query.invite === "accept" ? <p className="text-sm text-emerald-700">Convite aceito com sucesso.</p> : null}
      {query.invite === "reject" ? <p className="text-sm text-[var(--color-ink)]">Convite recusado.</p> : null}
      {query.invite === "error" ? <p className="text-sm text-red-700">Não foi possível responder ao convite.</p> : null}
      {query.owner_transfer === "accept" ? (
        <p className="text-sm text-emerald-700">Transferência de propriedade aceita com sucesso.</p>
      ) : null}
      {query.owner_transfer === "reject" ? <p className="text-sm text-[var(--color-ink)]">Transferência de propriedade recusada.</p> : null}
      {query.owner_transfer === "error" ? (
        <p className="text-sm text-red-700">Não foi possível responder à transferência de propriedade.</p>
      ) : null}

      {filteredNotifications.length === 0 ? (
        <p className="text-sm text-black/60">
          Nenhuma notificação encontrada
          {searchText ? ` para: ${searchText}` : "."}
        </p>
      ) : (
        <div className="rounded-[10px] bg-white px-3 py-2">
          {visibleGroups.map((groupKey, groupIndex) => (
            <section key={groupKey} className="py-1">
              {visibleGroups.length > 1 ? (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-black/50">{contextLabel(groupKey)}</p>
              ) : null}

              <div>
                {groupedByContext[groupKey].map((notification, index) => (
                  <div key={notification.id}>
                    <NotificationRow locale={locale} notification={notification} redirectPath={redirectPath} />
                    {index < groupedByContext[groupKey].length - 1 ? <hr className="border-black/10" /> : null}
                  </div>
                ))}
              </div>

              {groupIndex < visibleGroups.length - 1 ? <hr className="my-2 border-black/15" /> : null}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationRow({
  locale,
  notification,
  redirectPath,
}: {
  locale: string;
  notification: NotificationItem;
  redirectPath: string;
}) {
  const action = resolveNotificationAction(locale, notification);
  const icon = renderNotificationIcon(resolveNotificationIconKey(notification));
  const inviteOrganizationSlug = resolveInviteOrganizationSlug(notification);
  const inviteRole = resolveInviteRole(notification);
  const inviteStatus = resolveInviteStatus(notification);
  const ownerTransferOrganizationSlug = resolveOwnerTransferOrganizationSlug(notification);
  const ownerTransferStatus = resolveOwnerTransferStatus(notification);
  const isInviteNotification = notification.data?.type === "organization_member_invited";
  const isInviteAccepted = inviteStatus === "accepted";
  const canRespondInvite = isInviteNotification && Boolean(inviteOrganizationSlug) && !isInviteAccepted;
  const canViewCommunity = isInviteNotification && Boolean(inviteOrganizationSlug) && isInviteAccepted;
  const isOwnerTransferNotification = notification.data?.type === "organization_owner_transfer_requested";
  const canRespondOwnerTransfer =
    isOwnerTransferNotification &&
    Boolean(ownerTransferOrganizationSlug) &&
    ownerTransferStatus !== "accepted" &&
    ownerTransferStatus !== "rejected";
  const canViewTransferredCommunity =
    isOwnerTransferNotification &&
    Boolean(ownerTransferOrganizationSlug) &&
    (ownerTransferStatus === "accepted" || Boolean(notification.read_at));
  const showInlineReadButton = !notification.read_at && !action && !canRespondInvite && !isOwnerTransferNotification;
  const clickable = Boolean(action) && !canRespondInvite && !canRespondOwnerTransfer;
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-black/5 text-black/75">{icon}</span>

      <div className="min-w-0 flex-1">
        {clickable && action ? (
          <form action={`/api/notifications/${notification.id}/read`} method="post" className="block">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="redirect_to" value={action} />
            <button type="submit" className="block cursor-pointer text-left">
              <p className={`line-clamp-1 text-sm font-semibold ${notification.read_at ? "text-black/70" : "text-[var(--color-ink)]"}`}>
                {notification.data?.title ?? "Notificação"}
              </p>
              <p className="line-clamp-2 text-sm text-black/70">{notification.data?.message ?? "Sem detalhes."}</p>
            </button>
          </form>
        ) : (
          <div className="cursor-default">
            <p className={`line-clamp-1 text-sm font-semibold ${notification.read_at ? "text-black/70" : "text-[var(--color-ink)]"}`}>
              {notification.data?.title ?? "Notificação"}
            </p>
            <p className="line-clamp-2 text-sm text-black/70">{notification.data?.message ?? "Sem detalhes."}</p>
          </div>
        )}
        {canRespondInvite ? <p className="mt-1 text-xs font-medium text-black/55">Cargo no convite: {roleLabel(inviteRole)}</p> : null}
        {canViewCommunity ? <p className="mt-1 text-xs font-medium text-emerald-700">Convite aceito.</p> : null}
        {canRespondOwnerTransfer ? (
          <p className="mt-1 text-xs font-medium text-black/55">Você recebeu uma solicitação para se tornar dono da comunidade.</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-black/50">
            {new Date(notification.created_at).toLocaleString("pt-BR")} • {notification.read_at ? "Lida" : "Não lida"}
          </p>

          {showInlineReadButton ? (
            <form action={`/api/notifications/${notification.id}/read`} method="post">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="redirect_to" value={redirectPath} />
              <button
                type="submit"
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-black/10 bg-white px-2 text-xs font-semibold text-black/70"
              >
                <CheckCheck size={12} />
                Marcar como lida
              </button>
            </form>
          ) : null}

          {canRespondInvite && inviteOrganizationSlug ? (
            <div className="flex items-center gap-2">
              <form action={`/api/organizations/${inviteOrganizationSlug}/members/respond`} method="post">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="decision" value="accept" />
                <input type="hidden" name="notification_id" value={notification.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700"
                >
                  Aceitar
                </button>
              </form>
              <form action={`/api/organizations/${inviteOrganizationSlug}/members/respond`} method="post">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="decision" value="reject" />
                <input type="hidden" name="notification_id" value={notification.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700"
                >
                  Recusar
                </button>
              </form>
            </div>
          ) : null}

          {canViewCommunity && inviteOrganizationSlug ? (
            <Link
              href={`/${locale}/organizations/${inviteOrganizationSlug}`}
              className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 text-xs font-semibold text-[var(--color-ink)]"
            >
              Ver comunidade
            </Link>
          ) : null}

          {canRespondOwnerTransfer && ownerTransferOrganizationSlug ? (
            <div className="flex items-center gap-2">
              <form action={`/api/organizations/${ownerTransferOrganizationSlug}/owner-transfer/respond`} method="post">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="decision" value="accept" />
                <input type="hidden" name="notification_id" value={notification.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700"
                >
                  Aceitar
                </button>
              </form>
              <form action={`/api/organizations/${ownerTransferOrganizationSlug}/owner-transfer/respond`} method="post">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="decision" value="reject" />
                <input type="hidden" name="notification_id" value={notification.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700"
                >
                  Recusar
                </button>
              </form>
            </div>
          ) : null}

          {canViewTransferredCommunity && ownerTransferOrganizationSlug ? (
            <Link
              href={`/${locale}/organizations/${ownerTransferOrganizationSlug}`}
              className="inline-flex h-8 cursor-pointer items-center rounded-[6px] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 text-xs font-semibold text-[var(--color-ink)]"
            >
              Ver comunidade
            </Link>
          ) : null}
        </div>
      </div>

      <form action={`/api/notifications/${notification.id}/delete`} method="post">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="redirect_to" value={redirectPath} />
        <button
          type="submit"
          aria-label="Remover notificação"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-black/55 hover:bg-black/5 hover:text-red-700"
        >
          <Trash2 size={14} />
        </button>
      </form>
    </div>
  );
}

function groupNotificationsByContext(items: NotificationItem[]): Record<NotificationContext, NotificationItem[]> {
  return items.reduce<Record<NotificationContext, NotificationItem[]>>(
    (groups, notification) => {
      const context = resolveNotificationContext(notification);
      groups[context].push(notification);
      return groups;
    },
    {
      chat: [],
      community: [],
      opportunity: [],
      other: [],
    }
  );
}

function contextLabel(context: NotificationContext): string {
  if (context === "chat") {
    return "Chat";
  }
  if (context === "community") {
    return "Comunidade";
  }
  if (context === "opportunity") {
    return "Oportunidade";
  }
  return "Outros";
}

function renderNotificationIcon(icon?: string): ReactNode {
  switch (icon) {
    case "user-plus":
      return <UserPlus size={14} />;
    case "check-circle-2":
      return <CheckCheck size={14} />;
    case "x-circle":
      return <XCircle size={14} />;
    case "users-round":
      return <UsersRound size={14} />;
    case "clapperboard":
      return <Clapperboard size={14} />;
    case "message-circle":
      return <MessageCircle size={14} />;
    case "trophy":
      return <Trophy size={14} />;
    default:
      return <Bell size={14} />;
  }
}

function resolveInviteOrganizationSlug(notification: NotificationItem) {
  return notification.data?.organization_slug ?? notification.data?.meta?.organization_slug ?? null;
}

function resolveInviteRole(notification: NotificationItem) {
  return notification.data?.role ?? notification.data?.meta?.role ?? null;
}

function resolveInviteStatus(notification: NotificationItem) {
  return notification.data?.invite_status ?? notification.data?.meta?.invite_status ?? null;
}

function resolveOwnerTransferOrganizationSlug(notification: NotificationItem) {
  return notification.data?.organization_slug ?? notification.data?.meta?.organization_slug ?? null;
}

function resolveOwnerTransferStatus(notification: NotificationItem) {
  const transferStatus = notification.data?.transfer_status;
  if (typeof transferStatus === "string" && transferStatus.length > 0) {
    return transferStatus;
  }

  const meta = notification.data?.meta as { transfer_status?: unknown } | undefined;
  return typeof meta?.transfer_status === "string" && meta.transfer_status.length > 0 ? meta.transfer_status : null;
}

function roleLabel(role: string | null) {
  if (role === "admin") {
    return "Colaborador";
  }
  if (role === "editor") {
    return "Dublador";
  }
  if (role === "member") {
    return "Usuário";
  }
  return "Usuário";
}
