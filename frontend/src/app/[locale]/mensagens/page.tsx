import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ChatScreen } from "@/components/chat/chat-screen";
import { fetchCurrentUser } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ com?: string; c?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar?next=${encodeURIComponent(`/${locale}/mensagens`)}`);
  }

  const currentUser = await fetchCurrentUser(token);
  if (!currentUser) {
    redirect(`/${locale}/entrar?next=${encodeURIComponent(`/${locale}/mensagens`)}`);
  }

  const search = await searchParams;
  const maybeUserId = Number(search.com);
  const maybeConversationId = Number(search.c);
  const initialPeerUserId = Number.isInteger(maybeUserId) && maybeUserId > 0 ? maybeUserId : null;
  const initialConversationId = Number.isInteger(maybeConversationId) && maybeConversationId > 0 ? maybeConversationId : null;

  return (
    <ChatScreen
      currentUserId={currentUser.id}
      initialPeerUserId={initialPeerUserId}
      initialConversationId={initialConversationId}
    />
  );
}
