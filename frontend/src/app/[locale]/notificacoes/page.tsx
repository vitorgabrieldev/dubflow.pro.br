import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Bell,
  MessageCircle,
  Clapperboard,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Trophy,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardBody } from "@/components/ui/card";
import { fetchNotifications, markAllNotificationsAsRead, resolveMediaUrl } from "@/lib/api";
import { isLocale } from "@/lib/i18n";
import type { NotificationItem } from "@/types/api";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invite?: string; owner_transfer?: string }>;
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

  await markAllNotificationsAsRead(token);
  const payload = await fetchNotifications(token);

  if (!payload) {
    return (
      <Card>
        <CardBody className="p-4 text-sm text-black/65">Não foi possível carregar notificações agora.</CardBody>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
            <Bell size={16} />
            Central de notificações
          </p>

          <div className="flex items-center gap-2">
            <form action="/api/notifications/read-all" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                <CheckCheck size={14} />
                Ler todas
              </button>
            </form>

            <form action="/api/notifications/clear" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
              >
                <Trash2 size={14} />
                Limpar todas
              </button>
            </form>
          </div>
        </CardBody>
      </Card>

      {query.invite === "accept" ? (
        <Card>
          <CardBody className="p-4 text-sm text-emerald-700">Convite aceito com sucesso.</CardBody>
        </Card>
      ) : null}
      {query.invite === "reject" ? (
        <Card>
          <CardBody className="p-4 text-sm text-[var(--color-ink)]">Convite recusado.</CardBody>
        </Card>
      ) : null}
      {query.invite === "error" ? (
        <Card>
          <CardBody className="p-4 text-sm text-red-700">Não foi possível responder ao convite.</CardBody>
        </Card>
      ) : null}
      {query.owner_transfer === "accept" ? (
        <Card>
          <CardBody className="p-4 text-sm text-emerald-700">Transferência de propriedade aceita com sucesso.</CardBody>
        </Card>
      ) : null}
      {query.owner_transfer === "reject" ? (
        <Card>
          <CardBody className="p-4 text-sm text-[var(--color-ink)]">Transferência de propriedade recusada.</CardBody>
        </Card>
      ) : null}
      {query.owner_transfer === "error" ? (
        <Card>
          <CardBody className="p-4 text-sm text-red-700">Não foi possível responder à transferência de propriedade.</CardBody>
        </Card>
      ) : null}

      {payload.items.data.length === 0 ? (
        <Card>
          <CardBody className="p-4 text-sm text-black/65">Sua central está vazia.</CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {payload.items.data.map((notification) => {
            const action = resolveAction(locale, notification);
            const icon = resolveNotificationIcon(notification.data?.icon);
            const image = resolveMediaUrl(notification.data?.image ?? null);
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
            const showInlineReadButton =
              !notification.read_at &&
              !action &&
              !canRespondInvite &&
              !isOwnerTransferNotification;

            const content = (
              <div
                className={`rounded-[8px] border px-3 py-3 ${
                  notification.read_at ? "border-black/10 bg-white/80" : "border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-black/5 text-black/75">{icon}</span>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{notification.data?.title ?? "Notificação"}</p>
                    <p className="line-clamp-2 text-sm text-black/70">{notification.data?.message ?? "Sem detalhes."}</p>
                    {canRespondInvite ? (
                      <p className="mt-1 text-xs font-medium text-black/55">Cargo no convite: {roleLabel(inviteRole)}</p>
                    ) : null}
                    {canViewCommunity ? <p className="mt-1 text-xs font-medium text-emerald-700">Convite aceito.</p> : null}
                    {canRespondOwnerTransfer ? (
                      <p className="mt-1 text-xs font-medium text-black/55">Você recebeu uma solicitação para se tornar dono da comunidade.</p>
                    ) : null}
                  </div>

                  {image ? (
                    <span className="relative h-12 w-16 overflow-hidden rounded-[6px] border border-black/10">
                      <Image src={image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-black/50">
                    {new Date(notification.created_at).toLocaleString("pt-BR")} •{" "}
                    {notification.read_at ? "Lida" : "Não lida"}
                  </p>

                  {showInlineReadButton ? (
                    <form action={`/api/notifications/${notification.id}/read`} method="post">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="redirect_to" value={`/${locale}/notificacoes`} />
                      <button
                        type="submit"
                        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[6px] border border-black/10 bg-white px-2 text-xs font-semibold text-black/70"
                      >
                        <CheckCircle2 size={12} />
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
            );

            if (action && !canRespondInvite && !canRespondOwnerTransfer) {
              return (
                <form key={notification.id} action={`/api/notifications/${notification.id}/read`} method="post" className="block">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="redirect_to" value={action} />
                  <button type="submit" className="block w-full cursor-pointer text-left">
                    {content}
                  </button>
                </form>
              );
            }

            return <div key={notification.id}>{content}</div>;
          })}
        </div>
      )}
    </section>
  );
}

function resolveNotificationIcon(icon?: string): ReactNode {
  switch (icon) {
    case "user-plus":
      return <UserPlus size={14} />;
    case "check-circle-2":
      return <CheckCircle2 size={14} />;
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

function resolveAction(locale: string, notification: NotificationItem) {
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
  return typeof meta?.transfer_status === "string" && meta.transfer_status.length > 0
    ? meta.transfer_status
    : null;
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
