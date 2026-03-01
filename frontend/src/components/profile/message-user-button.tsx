"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

type MessageUserButtonProps = {
  locale: string;
  userId: number;
  isAuthenticated: boolean;
  canMessage: boolean;
  reason?: string | null;
};

export function MessageUserButton({ locale, userId, isAuthenticated, canMessage, reason }: MessageUserButtonProps) {
  const router = useRouter();

  const href = useMemo(() => {
    if (!isAuthenticated) {
      return `/${locale}/entrar?next=${encodeURIComponent(`/${locale}/mensagens?com=${userId}`)}`;
    }

    return `/${locale}/mensagens?com=${userId}`;
  }, [isAuthenticated, locale, userId]);

  if (!isAuthenticated && !canMessage) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="neutral"
      title={!canMessage ? reason ?? "Você não pode enviar mensagem para este perfil no momento." : "Enviar mensagem"}
      disabled={isAuthenticated && !canMessage}
      onClick={() => {
        router.push(href);
      }}
    >
      <MessageCircle size={14} />
      Mensagem
    </Button>
  );
}
