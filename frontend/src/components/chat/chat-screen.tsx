"use client";

import Image from "next/image";
import {
  ArrowUp,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Loader2,
  Lock,
  Menu,
  MessageCircle,
  Pencil,
  Paperclip,
  Pause,
  Play,
  Reply,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Pusher from "pusher-js";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { resolveMediaUrl } from "@/lib/api";
import type { ChatAttachment, ChatConversation, ChatMessage } from "@/types/api";

type ChatScreenProps = {
  currentUserId: number;
  initialPeerUserId: number | null;
  initialConversationId: number | null;
};

type ConversationsPayload = {
  items?: ChatConversation[];
  pagination?: {
    current_page?: number;
    per_page?: number;
    last_page?: number;
    total?: number;
    has_more?: boolean;
  };
};

type MessagesPayload = {
  items?: ChatMessage[];
};

type ConversationPayload = {
  conversation?: ChatConversation;
  message?: string;
};

type RenamePeerPayload = {
  message?: string;
  peer_alias?: string | null;
};

type MessageMutationPayload = {
  message?: ChatMessage | string;
  error?: string;
};

type MessageImageLightboxState = {
  items: ChatAttachment[];
  index: number;
};

type IncomingSocketMessagePayload = {
  conversation_id: number;
  message: ChatMessage;
};

type IncomingSocketStatusPayload = {
  conversation_id: number;
  message_id: number;
  delivered_at?: string | null;
  read_at?: string | null;
};

type IncomingTypingPayload = {
  conversation_id: number;
  is_typing: boolean;
  user?: {
    id?: number;
    name?: string;
    stage_name?: string | null;
  };
};

const CHAT_POLL_FALLBACK_MS = 20_000;
const CHAT_CONVERSATIONS_PER_PAGE = 20;
const CHAT_MAX_ATTACHMENTS = 8;
const CHAT_REPLY_MARKER_PATTERN = /^\[\[reply:(\d+)]]\s*\n?/;

export function ChatScreen({ currentUserId, initialPeerUserId, initialConversationId }: ChatScreenProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<number, ChatMessage[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [replyingToMessageId, setReplyingToMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingReplyToMessageId, setEditingReplyToMessageId] = useState<number | null>(null);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<number | null>(null);
  const [openConversationMenu, setOpenConversationMenu] = useState(false);
  const [showRenameContactModal, setShowRenameContactModal] = useState(false);
  const [renameContactValue, setRenameContactValue] = useState("");
  const [renamingContact, setRenamingContact] = useState(false);
  const [showBlockedConversations, setShowBlockedConversations] = useState(false);
  const [fileLimitError, setFileLimitError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<"idle" | "connected" | "disconnected">("idle");
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [messageImageLightbox, setMessageImageLightbox] = useState<MessageImageLightboxState | null>(null);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);

  const bootedPeerRef = useRef(false);
  const typingStateRef = useRef(false);
  const activeConversationIdRef = useRef<number | null>(null);
  const conversationsPageRef = useRef(1);
  const isLoadingMessagesRef = useRef(false);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const pendingInitialScrollConversationRef = useRef<number | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsPageRef.current = conversationsPage;
  }, [conversationsPage]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const activeMessages = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }

    return messagesByConversation[activeConversationId] ?? [];
  }, [activeConversationId, messagesByConversation]);

  const replyingToMessage = useMemo(() => {
    if (!replyingToMessageId) {
      return null;
    }

    return activeMessages.find((message) => message.id === replyingToMessageId) ?? null;
  }, [activeMessages, replyingToMessageId]);
  const canUsePortal = typeof window !== "undefined";

  const resolvePeerBaseName = useCallback((conversation: ChatConversation | null) => {
    return conversation?.peer?.stage_name?.trim() || conversation?.peer?.name || "Usuário";
  }, []);

  const resolvePeerDisplayName = useCallback(
    (conversation: ChatConversation | null) => {
      return conversation?.peer?.custom_name?.trim() || resolvePeerBaseName(conversation);
    },
    [resolvePeerBaseName]
  );

  const nextLightboxImage = useCallback(() => {
    setMessageImageLightbox((current) => {
      if (!current || current.items.length <= 1) {
        return current;
      }

      return {
        ...current,
        index: (current.index + 1) % current.items.length,
      };
    });
  }, []);

  const previousLightboxImage = useCallback(() => {
    setMessageImageLightbox((current) => {
      if (!current || current.items.length <= 1) {
        return current;
      }

      return {
        ...current,
        index: (current.index - 1 + current.items.length) % current.items.length,
      };
    });
  }, []);

  const sortConversations = useCallback((items: ChatConversation[]) => {
    return [...items].sort((a, b) => {
      const left = new Date(a.updated_at ?? a.last_message?.created_at ?? 0).getTime();
      const right = new Date(b.updated_at ?? b.last_message?.created_at ?? 0).getTime();
      return right - left;
    });
  }, []);

  const applyMessageStatus = useCallback(
    (message: ChatMessage): ChatMessage => {
      if (message.sender_user_id !== currentUserId) {
        if (message.read_at) {
          return { ...message, status: "read" };
        }
        if (message.delivered_at) {
          return { ...message, status: "received_unread" };
        }
        return { ...message, status: "not_received" };
      }

      if (message.read_at) {
        return { ...message, status: "received_read" };
      }
      if (message.delivered_at) {
        return { ...message, status: "received_unread" };
      }

      return { ...message, status: "sent_not_received" };
    },
    [currentUserId]
  );

  const loadConversations = useCallback(
    async ({
      showLoader = false,
      mode = "refresh",
    }: {
      showLoader?: boolean;
      mode?: "reset" | "append" | "refresh";
    } = {}) => {
      if (showLoader) {
        setLoadingConversations(true);
      }
      if (mode === "append") {
        setLoadingMoreConversations(true);
      }

      const page = mode === "append" ? conversationsPageRef.current + 1 : 1;
      const query = new URLSearchParams({
        per_page: String(CHAT_CONVERSATIONS_PER_PAGE),
        page: String(page),
      });

      try {
        const response = await fetch(`/api/chat/conversations?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as ConversationsPayload & { message?: string };
        if (!response.ok) {
          setError(payload.message ?? "Não foi possível carregar suas conversas.");
          return;
        }

        const items = payload.items ?? [];
        const paginationHasMore = payload.pagination?.has_more === true;
        const incomingIds = new Set(items.map((item) => item.id));
        const incomingById = new Map(items.map((item) => [item.id, item]));

        setConversations((current) => {
          const base =
            mode === "append"
              ? [...current, ...items]
              : [...items, ...current.filter((item) => !incomingIds.has(item.id))];

          const merged = sortConversations(
            base
              .filter((item, index, source) => source.findIndex((candidate) => candidate.id === item.id) === index)
              .map((item) => {
                const override = incomingById.get(item.id);
                return override ?? item;
              })
          );

          const hasActive = activeConversationIdRef.current ? merged.some((item) => item.id === activeConversationIdRef.current) : false;
          if (!hasActive) {
            if (merged.length > 0) {
              setActiveConversationId(merged[0].id);
            } else {
              setActiveConversationId(null);
            }
          }
          return merged;
        });

        if (mode === "append") {
          setConversationsPage(page);
          setHasMoreConversations(paginationHasMore);
        } else if (mode === "reset") {
          setConversationsPage(1);
          setHasMoreConversations(paginationHasMore);
        } else if (conversationsPageRef.current <= 1) {
          setHasMoreConversations(paginationHasMore);
        }

        setError(null);
      } catch {
        setError("Falha de conexão ao carregar conversas.");
      } finally {
        if (showLoader) {
          setLoadingConversations(false);
        }
        if (mode === "append") {
          setLoadingMoreConversations(false);
        }
      }
    },
    [sortConversations]
  );

  const loadMessages = useCallback(
    async (conversationId: number, silent = false) => {
      if (isLoadingMessagesRef.current && !silent) {
        return;
      }

      if (!silent) {
        setLoadingMessages(true);
      }

      isLoadingMessagesRef.current = true;

      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages?per_page=60`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as MessagesPayload & { message?: string };
        if (!response.ok) {
          if (!silent) {
            setError(payload.message ?? "Não foi possível carregar as mensagens.");
          }
          return;
        }

        const items = (payload.items ?? []).map((message) => applyMessageStatus(message));

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: items,
        }));
        if (!silent) {
          pendingInitialScrollConversationRef.current = conversationId;
        }

        if (!silent) {
          await fetch(`/api/chat/conversations/${conversationId}/read`, {
            method: "POST",
          });
        }

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  unread_count: 0,
                  last_message:
                    conversation.last_message && items.length > 0
                      ? applyMessageStatus({ ...conversation.last_message })
                      : conversation.last_message,
                }
              : conversation
          )
        );

        if (!silent) {
          setError(null);
        }
      } catch {
        if (!silent) {
          setError("Falha de conexão ao carregar mensagens.");
        }
      } finally {
        isLoadingMessagesRef.current = false;
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [applyMessageStatus]
  );

  const patchMessageInState = useCallback(
    (conversationId: number, messageId: number, patch: Partial<ChatMessage>) => {
      setMessagesByConversation((current) => {
        const list = current[conversationId] ?? [];
        if (!list.some((message) => message.id === messageId)) {
          return current;
        }

        return {
          ...current,
          [conversationId]: list.map((message) =>
            message.id === messageId ? applyMessageStatus({ ...message, ...patch }) : message
          ),
        };
      });

      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId || !conversation.last_message || conversation.last_message.id !== messageId) {
            return conversation;
          }

          return {
            ...conversation,
            last_message: applyMessageStatus({ ...conversation.last_message, ...patch }),
          };
        })
      );
    },
    [applyMessageStatus]
  );

  const emitTyping = useCallback(async (isTyping: boolean) => {
    if (!activeConversationIdRef.current) {
      return;
    }

    if (typingStateRef.current === isTyping) {
      return;
    }

    typingStateRef.current = isTyping;

    await fetch(`/api/chat/conversations/${activeConversationIdRef.current}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_typing: isTyping }),
    }).catch(() => {
      // Ignore typing errors.
    });
  }, []);

  const startConversationWithUser = useCallback(
    async (targetUserId: number) => {
      const response = await fetch(`/api/chat/conversations/with/${targetUserId}`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as ConversationPayload;
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível iniciar conversa com este usuário.");
        return;
      }

      const conversation = payload.conversation;
      if (!conversation) {
        setError("Conversa iniciada, mas sem retorno válido do servidor.");
        return;
      }

      setConversations((current) => {
        const filtered = current.filter((item) => item.id !== conversation.id);
        return sortConversations([conversation, ...filtered]);
      });

      setActiveConversationId(conversation.id);
      setError(null);
    },
    [sortConversations]
  );

  useEffect(() => {
    void loadConversations({ showLoader: true, mode: "reset" });
  }, [loadConversations]);

  useEffect(() => {
    if (bootedPeerRef.current) {
      return;
    }

    if (!initialPeerUserId) {
      bootedPeerRef.current = true;
      return;
    }

    bootedPeerRef.current = true;
    void startConversationWithUser(initialPeerUserId);
  }, [initialPeerUserId, startConversationWithUser]);

  useEffect(() => {
    if (!initialConversationId) {
      return;
    }

    if (activeConversationIdRef.current) {
      return;
    }

    if (conversations.some((conversation) => conversation.id === initialConversationId)) {
      setActiveConversationId(initialConversationId);
    }
  }, [conversations, initialConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    pendingInitialScrollConversationRef.current = activeConversationId;
    setOpenConversationMenu(false);
    setOpenMessageMenuId(null);
    setReplyingToMessageId(null);
    setEditingMessageId(null);
    setEditingBody("");
    setEditingReplyToMessageId(null);

    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useLayoutEffect(() => {
    if (!activeConversationId || loadingMessages) {
      return;
    }

    if (pendingInitialScrollConversationRef.current !== activeConversationId) {
      return;
    }

    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
    pendingInitialScrollConversationRef.current = null;
  }, [activeConversationId, activeMessages.length, loadingMessages]);

  useEffect(() => {
    if (!activeConversationIdRef.current) {
      return;
    }

    if (composerText.trim().length === 0) {
      void emitTyping(false);
      return;
    }

    void emitTyping(true);
  }, [composerText, emitTyping]);

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
    if (!appKey) {
      setSocketState("disconnected");
      setShowReloadPrompt(false);
      return;
    }

    const wsHost = process.env.NEXT_PUBLIC_REVERB_HOST ?? window.location.hostname;
    const wsPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);
    const wsScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";
    const forceTLS = wsScheme === "https";

    const pusher = new Pusher(appKey, {
      wsHost,
      wsPort,
      wssPort: wsPort,
      forceTLS,
      enabledTransports: ["ws", "wss"],
      cluster: "mt1",
      channelAuthorization: {
        endpoint: "/api/realtime/auth",
        transport: "ajax",
      },
    });

    const channel = pusher.subscribe(`private-chat.user.${currentUserId}`);

    pusher.connection.bind("connected", () => {
      setSocketState("connected");
      setShowReloadPrompt(false);
    });

    pusher.connection.bind("disconnected", () => {
      setSocketState("disconnected");
      setShowReloadPrompt(true);
    });

    pusher.connection.bind("unavailable", () => {
      setSocketState("disconnected");
      setShowReloadPrompt(true);
    });

    channel.bind("chat.message.created", (payload: IncomingSocketMessagePayload) => {
      const conversationId = payload.conversation_id;
      const incoming = applyMessageStatus(payload.message);

      setMessagesByConversation((current) => {
        const existing = current[conversationId] ?? [];
        if (existing.some((message) => message.id === incoming.id)) {
          return current;
        }

        return {
          ...current,
          [conversationId]: [...existing, incoming],
        };
      });

      setConversations((current) => {
        const index = current.findIndex((conversation) => conversation.id === conversationId);
        if (index === -1) {
          void loadConversations({ mode: "refresh" });
          return current;
        }

        const copy = [...current];
        const conversation = copy[index];
        const shouldIncrementUnread = incoming.recipient_user_id === currentUserId && activeConversationIdRef.current !== conversationId;

        copy[index] = {
          ...conversation,
          last_message: incoming,
          unread_count: shouldIncrementUnread ? conversation.unread_count + 1 : 0,
          updated_at: incoming.created_at,
        };

        return sortConversations(copy);
      });

      if (incoming.recipient_user_id === currentUserId && activeConversationIdRef.current === conversationId) {
        void fetch(`/api/chat/conversations/${conversationId}/read`, { method: "POST" }).catch(() => undefined);
      }
    });

    channel.bind("chat.message.updated", (payload: IncomingSocketMessagePayload) => {
      const message = applyMessageStatus(payload.message);
      patchMessageInState(payload.conversation_id, message.id, message);
    });

    channel.bind("chat.message.status", (payload: IncomingSocketStatusPayload) => {
      patchMessageInState(payload.conversation_id, payload.message_id, {
        delivered_at: payload.delivered_at ?? null,
        read_at: payload.read_at ?? null,
      });
    });

    channel.bind("chat.typing", (payload: IncomingTypingPayload) => {
      if (payload.conversation_id !== activeConversationIdRef.current) {
        return;
      }

      if (!payload.is_typing) {
        setTypingLabel(null);
        return;
      }

      const name = payload.user?.stage_name?.trim() || payload.user?.name?.trim() || "Usuário";
      setTypingLabel(`${name} está digitando...`);
    });

    return () => {
      pusher.disconnect();
    };
  }, [applyMessageStatus, currentUserId, loadConversations, patchMessageInState, sortConversations]);

  useEffect(() => {
    // When realtime socket is connected, avoid fallback polling to prevent request storms.
    if (socketState !== "disconnected") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadConversations({ mode: "refresh" });
      if (activeConversationIdRef.current) {
        void loadMessages(activeConversationIdRef.current, true);
      }
    }, CHAT_POLL_FALLBACK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadConversations, loadMessages, socketState]);

  useEffect(() => {
    if (!messageImageLightbox) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMessageImageLightbox(null);
        return;
      }

      if (event.key === "ArrowRight") {
        nextLightboxImage();
      }

      if (event.key === "ArrowLeft") {
        previousLightboxImage();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [messageImageLightbox, nextLightboxImage, previousLightboxImage]);

  useEffect(() => {
    if (!canUsePortal) {
      return;
    }

    if (!messageImageLightbox) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [canUsePortal, messageImageLightbox]);

  async function submitMessage() {
    if (!activeConversationId || sending) {
      return;
    }

    if (composerText.trim().length === 0 && composerFiles.length === 0) {
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      const normalizedBody = buildReplyBody(composerText, replyingToMessageId);
      if (normalizedBody !== null) {
        formData.set("body", normalizedBody);
      }

      for (const file of composerFiles) {
        formData.append("attachments[]", file);
      }

      const response = await fetch(`/api/chat/conversations/${activeConversationId}/messages`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as MessageMutationPayload;
      if (!response.ok) {
        const backendMessage = payload.error ?? (typeof payload.message === "string" ? payload.message : "Não foi possível enviar sua mensagem.");
        setError(backendMessage);
        return;
      }

      const message = typeof payload.message === "object" && payload.message ? payload.message : undefined;
      if (message) {
        const normalized = applyMessageStatus(message);
        setMessagesByConversation((current) => {
          const list = current[activeConversationId] ?? [];
          if (list.some((item) => item.id === normalized.id)) {
            return current;
          }

          return {
            ...current,
            [activeConversationId]: [...list, normalized],
          };
        });

        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation.id === activeConversationId
                ? {
                    ...conversation,
                    last_message: normalized,
                    unread_count: 0,
                    updated_at: normalized.created_at,
                  }
                : conversation
            )
          )
        );
      }

      setComposerText("");
      setComposerFiles([]);
      setReplyingToMessageId(null);
      setFileLimitError(null);
      setError(null);
      void emitTyping(false);
      requestAnimationFrame(() => {
        const viewport = messagesViewportRef.current;
        if (!viewport) {
          return;
        }

        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch {
      setError("Falha de conexão ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function saveEditedMessage(messageId: number) {
    if (!activeConversationId) {
      return;
    }

    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: buildReplyBody(editingBody, editingReplyToMessageId) ?? "",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as MessageMutationPayload;
    if (!response.ok) {
      const backendMessage = payload.error ?? (typeof payload.message === "string" ? payload.message : "Não foi possível editar a mensagem.");
      setError(backendMessage);
      return;
    }

    const message = typeof payload.message === "object" && payload.message ? payload.message : undefined;
    if (message) {
      patchMessageInState(activeConversationId, message.id, applyMessageStatus(message));
    }

    setEditingMessageId(null);
    setEditingBody("");
    setEditingReplyToMessageId(null);
  }

  async function removeMessage(messageId: number) {
    if (!activeConversationId) {
      return;
    }

    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => ({}))) as MessageMutationPayload;
    if (!response.ok) {
      const backendMessage = payload.error ?? (typeof payload.message === "string" ? payload.message : "Não foi possível remover a mensagem.");
      setError(backendMessage);
      return;
    }

    const message = typeof payload.message === "object" && payload.message ? payload.message : undefined;
    if (message) {
      patchMessageInState(activeConversationId, message.id, applyMessageStatus(message));
    }
  }

  async function removeConversation(conversationId: number) {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "Não foi possível apagar a conversa.");
      return;
    }

    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
    if (activeConversationIdRef.current === conversationId) {
      setActiveConversationId(null);
      setTypingLabel(null);
    }
    setOpenConversationMenu(false);
  }

  async function toggleBlockPeer(conversation: ChatConversation) {
    const peerId = conversation.peer?.id;
    if (!peerId) {
      return;
    }

    const method = conversation.is_blocked_by_me ? "DELETE" : "POST";
    const response = await fetch(`/api/chat/users/${peerId}/block`, {
      method,
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "Não foi possível atualizar o bloqueio.");
      return;
    }

    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              is_blocked_by_me: !conversation.is_blocked_by_me,
            }
          : item
      )
    );

    setError(null);
    setOpenConversationMenu(false);
  }

  async function submitPeerRename() {
    if (!activeConversation || renamingContact) {
      return;
    }

    setRenamingContact(true);
    try {
      const response = await fetch(`/api/chat/conversations/${activeConversation.id}/peer-alias`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          peer_alias: renameContactValue,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as RenamePeerPayload;
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível renomear este contato.");
        return;
      }

      const nextAlias = typeof payload.peer_alias === "string" ? payload.peer_alias : null;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id && conversation.peer
            ? {
                ...conversation,
                peer: {
                  ...conversation.peer,
                  custom_name: nextAlias,
                },
              }
            : conversation
        )
      );

      setShowRenameContactModal(false);
      setOpenConversationMenu(false);
      setError(null);
    } catch {
      setError("Falha de conexão ao renomear este contato.");
    } finally {
      setRenamingContact(false);
    }
  }

  function handlePickFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(event.target.files ?? []);
    if (list.length === 0) {
      return;
    }

    const totalAttachmentsAfterPick = composerFiles.length + list.length;
    if (totalAttachmentsAfterPick > CHAT_MAX_ATTACHMENTS) {
      const remainingSlots = CHAT_MAX_ATTACHMENTS - composerFiles.length;
      if (remainingSlots <= 0) {
        setFileLimitError("Você já atingiu o limite de 8 anexos por mensagem.");
      } else {
        setFileLimitError(
          `Você pode enviar no máximo 8 anexos por mensagem. Selecione até ${remainingSlots} arquivo(s) agora.`
        );
      }
      event.currentTarget.value = "";
      return;
    }

    const oversized = list.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) {
      const mb = (oversized.size / (1024 * 1024)).toFixed(1);
      setFileLimitError(`"${oversized.name}" tem ${mb}MB. O limite por arquivo é 50MB.`);
      event.currentTarget.value = "";
      return;
    }

    setFileLimitError(null);
    setComposerFiles((current) => [...current, ...list]);
    event.currentTarget.value = "";
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage();
  }

  const regularConversations = conversations.filter((conversation) => !conversation.is_blocked_by_me);
  const blockedConversations = conversations.filter((conversation) => conversation.is_blocked_by_me);
  const activeLightboxAttachment =
    messageImageLightbox && messageImageLightbox.items.length > 0
      ? messageImageLightbox.items[messageImageLightbox.index]
      : null;
  const activeLightboxUrl = activeLightboxAttachment ? resolveMediaUrl(activeLightboxAttachment.media_path) ?? "" : "";

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      {showReloadPrompt ? (
        <Card className="border-red-300 bg-red-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-red-700">A conexão realtime caiu. Recarregue a tela para reconectar o websocket.</p>
            <Button type="button" variant="neutral" onClick={() => window.location.reload()}>
              <RotateCcw size={14} />
              Recarregar tela
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="p-3 text-sm text-red-700">{error}</CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-[70vh] overflow-hidden">
          <CardBody className="flex h-full flex-col gap-3 p-0">
            <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Mensagens</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {loadingConversations ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-black/60">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando conversas...
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-3 py-6 text-sm text-black/60">Você ainda não tem conversas.</div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    {regularConversations.map((conversation) => {
                      const isActive = conversation.id === activeConversationId;
                      const peerName = resolvePeerDisplayName(conversation);
                      const preview = messageReplyPreview(conversation.last_message, "Sem mensagens ainda");
                      const lastAt = conversation.last_message?.created_at ?? conversation.updated_at ?? null;

                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => {
                            setActiveConversationId(conversation.id);
                            setTypingLabel(null);
                          }}
                          className={`w-full cursor-pointer rounded-[8px] px-3 py-2 text-left transition ${
                            isActive ? "bg-[var(--color-primary-soft)]" : "hover:bg-black/5"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Avatar src={resolveMediaUrl(conversation.peer?.avatar_path)} name={peerName} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{peerName}</p>
                                <div className="flex items-center gap-2">
                                  {lastAt ? <span className="text-[10px] text-black/50">{formatListTime(lastAt)}</span> : null}
                                  {conversation.unread_count > 0 ? (
                                    <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                                      {conversation.unread_count}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <p className="truncate text-xs text-black/60">{preview}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {blockedConversations.length > 0 ? (
                    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-black/5">
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
                        onClick={() => setShowBlockedConversations((current) => !current)}
                      >
                        <span className="text-xs font-semibold text-black/70">Conversas bloqueadas ({blockedConversations.length})</span>
                        <span className="text-xs text-black/50">{showBlockedConversations ? "Ocultar" : "Mostrar"}</span>
                      </button>

                      {showBlockedConversations ? (
                        <div className="space-y-1 border-t border-[var(--color-border-soft)] px-2 py-2">
                          {blockedConversations.map((conversation) => {
                            const peerName = resolvePeerDisplayName(conversation);
                            const isActive = conversation.id === activeConversationId;
                            return (
                              <button
                                key={conversation.id}
                                type="button"
                                onClick={() => setActiveConversationId(conversation.id)}
                                className={`w-full cursor-pointer rounded-[8px] px-2 py-2 text-left text-xs ${
                                  isActive ? "bg-white" : "hover:bg-white/70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-semibold text-black/75">{peerName}</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] text-black/60">
                                    <Lock size={10} />
                                    Bloqueado
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {hasMoreConversations ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-2 text-xs font-semibold text-black/70 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void loadConversations({ mode: "append" })}
                        disabled={loadingMoreConversations}
                      >
                        {loadingMoreConversations ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          "Carregar mais conversas"
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="h-[70vh] overflow-hidden">
          <CardBody className="flex h-full flex-col p-0">
            {!activeConversation ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-black/55">
                <div className="space-y-2">
                  <MessageCircle size={20} className="mx-auto text-black/35" />
                  <p>Selecione uma conversa para começar.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-soft)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {resolvePeerDisplayName(activeConversation)}
                    </p>
                    <p className="text-xs text-black/60">
                      {activeConversation.is_blocked_by_me ? "Usuário bloqueado por você." : "Conversa ativa"}
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Menu da conversa"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-border-soft)] bg-white text-black/70 hover:bg-black/5"
                      onClick={() => setOpenConversationMenu((current) => !current)}
                    >
                      <Menu size={16} />
                    </button>

                    {openConversationMenu ? (
                      <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-black/75 hover:bg-black/5"
                          onClick={() => {
                            setRenameContactValue(activeConversation.peer?.custom_name ?? "");
                            setShowRenameContactModal(true);
                            setOpenConversationMenu(false);
                          }}
                        >
                          <Pencil size={12} />
                          Renomear contato
                        </button>

                        {activeConversation.is_blocked_by_me ? (
                          <button
                            type="button"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              void toggleBlockPeer(activeConversation);
                            }}
                          >
                            <ShieldCheck size={12} />
                            Desbloquear
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-black/75 hover:bg-black/5"
                              onClick={() => {
                                void toggleBlockPeer(activeConversation);
                              }}
                            >
                              <Lock size={12} />
                              Bloquear
                            </button>
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => {
                                void removeConversation(activeConversation.id);
                              }}
                            >
                              <Trash2 size={12} />
                              Apagar conversa
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {loadingMessages ? (
                    <div className="flex items-center gap-2 text-sm text-black/55">
                      <Loader2 size={14} className="animate-spin" />
                      Carregando mensagens...
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <p className="text-sm text-black/55">Sem mensagens nesta conversa ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeMessages.map((message) => {
                        const mine = message.sender_user_id === currentUserId;
                        const editing = editingMessageId === message.id;
                        const parsedMessageBody = parseReplyBody(message.body);
                        const messageBody = parsedMessageBody.text;
                        const replyTargetMessage = parsedMessageBody.replyToMessageId
                          ? activeMessages.find((item) => item.id === parsedMessageBody.replyToMessageId) ?? null
                          : null;
                        const replyPreview = messageReplyPreview(replyTargetMessage, "Mensagem original indisponível");
                        const senderName =
                          message.sender?.stage_name?.trim() ||
                          message.sender?.name ||
                          (mine ? "Você" : "Usuário");
                        const senderAvatar = resolveMediaUrl(message.sender?.avatar_path);
                        const imageAttachments = message.attachments.filter((attachment) => attachment.media_type === "image");
                        const audioAttachments = message.attachments.filter((attachment) => attachment.media_type === "audio");
                        const nonImageNonAudioAttachments = message.attachments.filter(
                          (attachment) => attachment.media_type !== "image" && attachment.media_type !== "audio"
                        );

                        return (
                          <div key={message.id} className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine ? <Avatar src={senderAvatar} name={senderName} size="sm" className="shrink-0" /> : null}

                            {mine && !message.is_deleted && !editing ? (
                              <div className="relative flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label="Responder mensagem"
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white text-black/65 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-black/5"
                                  onClick={() => {
                                    setReplyingToMessageId(message.id);
                                    setOpenMessageMenuId(null);
                                  }}
                                >
                                  <Reply size={13} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Ações da mensagem"
                                  className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white text-black/65 shadow-sm transition ${
                                    openMessageMenuId === message.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  }`}
                                  onClick={() => setOpenMessageMenuId((current) => (current === message.id ? null : message.id))}
                                >
                                  <Ellipsis size={14} />
                                </button>

                                {openMessageMenuId === message.id ? (
                                  <div className="absolute left-0 top-9 z-20 w-36 overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-white p-1 shadow-lg">
                                    <button
                                      type="button"
                                      className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-black/75 hover:bg-black/5"
                                      onClick={() => {
                                        const editingDraft = parseReplyBody(message.body);
                                        setEditingMessageId(message.id);
                                        setEditingBody(editingDraft.text);
                                        setEditingReplyToMessageId(editingDraft.replyToMessageId);
                                        setOpenMessageMenuId(null);
                                      }}
                                    >
                                      <Ellipsis size={12} />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setOpenMessageMenuId(null);
                                        void removeMessage(message.id);
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      Excluir
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {!mine && !message.is_deleted && !editing ? (
                              <button
                                type="button"
                                aria-label="Responder mensagem"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white text-black/65 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-black/5"
                                onClick={() => setReplyingToMessageId(message.id)}
                              >
                                <Reply size={13} />
                              </button>
                            ) : null}

                            <article
                              className={`relative rounded-[10px] border px-2.5 py-2 text-[13px] ${
                                mine
                                  ? "max-w-[74%] border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]"
                                  : "max-w-[74%] border-[var(--color-border-soft)] bg-white"
                              }`}
                            >
                              <span aria-hidden className="pointer-events-none absolute inset-0">
                                {mine ? (
                                  <>
                                    <span className="absolute -right-[10px] bottom-2 h-0 w-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-[var(--color-primary)]/30" />
                                    <span className="absolute -right-[8px] bottom-[9px] h-0 w-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-[var(--color-primary-soft)]" />
                                  </>
                                ) : (
                                  <>
                                    <span className="absolute -left-[10px] bottom-2 h-0 w-0 border-y-[7px] border-y-transparent border-r-[10px] border-r-[var(--color-border-soft)]" />
                                    <span className="absolute -left-[8px] bottom-[9px] h-0 w-0 border-y-[6px] border-y-transparent border-r-[9px] border-r-white" />
                                  </>
                                )}
                              </span>

                              {editing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingBody}
                                    onChange={(event) => setEditingBody(event.target.value)}
                                    className="min-h-20 w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button type="button" variant="neutral" onClick={() => void saveEditedMessage(message.id)}>
                                      Salvar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="neutral"
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingBody("");
                                        setEditingReplyToMessageId(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {!message.is_deleted && parsedMessageBody.replyToMessageId ? (
                                    <div
                                      className={`mb-2 rounded-[8px] border px-2 py-1.5 text-xs ${
                                        mine
                                          ? "border-[var(--color-primary)]/35 bg-white/60 text-black/65"
                                          : "border-black/10 bg-black/[0.03] text-black/60"
                                      }`}
                                    >
                                      <p className="font-semibold uppercase tracking-wide text-[10px]">Resposta</p>
                                      <p className="line-clamp-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                        {replyPreview}
                                      </p>
                                    </div>
                                  ) : null}

                                  {message.is_deleted ? (
                                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[var(--color-ink)]">
                                      <strong>Mensagem removida</strong>
                                    </p>
                                  ) : messageBody.trim().length > 0 ? (
                                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[var(--color-ink)]">
                                      {messageBody}
                                    </p>
                                  ) : null}

                                  {!message.is_deleted && imageAttachments.length > 0 ? (
                                    <ChatImageAttachmentGrid
                                      attachments={imageAttachments}
                                      onOpen={(index) => {
                                        setMessageImageLightbox({
                                          items: imageAttachments,
                                          index,
                                        });
                                      }}
                                    />
                                  ) : null}

                                  {!message.is_deleted && audioAttachments.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                      {audioAttachments.map((attachment) => (
                                        <ChatAudioAttachmentPlayer key={attachment.id} attachment={attachment} />
                                      ))}
                                    </div>
                                  ) : null}

                                  {!message.is_deleted && nonImageNonAudioAttachments.length > 0 ? (
                                    <div className="mt-2 space-y-1">
                                      {nonImageNonAudioAttachments.map((attachment) => (
                                        <a
                                          key={attachment.id}
                                          href={resolveMediaUrl(attachment.media_path) ?? undefined}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block truncate text-xs font-semibold text-[var(--color-primary)] underline"
                                        >
                                          {attachment.original_name?.trim() || `Anexo ${attachment.id}`}
                                        </a>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-black/55">
                                    <span>
                                      {formatTime(message.created_at)}
                                      {message.is_edited ? " · editada" : ""}
                                    </span>
                                    {mine ? renderStatusIndicator(message) : null}
                                  </div>
                                </>
                              )}
                            </article>

                            {mine ? <Avatar src={senderAvatar} name={senderName} size="sm" className="shrink-0" /> : null}
                          </div>
                        );
                      })}

                      {typingLabel ? (
                        <div className="flex items-end gap-2 justify-start">
                          <Avatar
                            src={resolveMediaUrl(activeConversation.peer?.avatar_path)}
                            name={resolvePeerDisplayName(activeConversation)}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="inline-flex max-w-[74%] items-center gap-1 rounded-[10px] border border-[var(--color-border-soft)] bg-white px-3 py-2">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:120ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:240ms]" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {!activeConversation.is_blocked_by_me ? (
                  <div className="border-t border-[var(--color-border-soft)] px-4 py-3">
                    <div className="space-y-2">
                      {replyingToMessageId ? (
                        <div className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/70 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink)]">Respondendo</p>
                            <p className="line-clamp-2 whitespace-pre-wrap text-xs text-black/70">
                              {messageReplyPreview(replyingToMessage, "Mensagem original indisponível")}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 shrink-0 aspect-square cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white p-0 text-black/60 hover:bg-black/5"
                            onClick={() => setReplyingToMessageId(null)}
                            aria-label="Cancelar resposta"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null}

                      {composerFiles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {composerFiles.map((file, index) => (
                            <span
                              key={`${file.name}-${file.size}-${index}`}
                              className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs text-black/70"
                            >
                              <span className="max-w-[180px] truncate">{file.name}</span>
                              <button
                                type="button"
                                className="cursor-pointer text-black/55 hover:text-red-700"
                                onClick={() => setComposerFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {fileLimitError ? <p className="text-xs font-semibold text-red-700">{fileLimitError}</p> : null}

                      <div className="relative">
                        <textarea
                          value={composerText}
                          onChange={(event) => setComposerText(event.target.value)}
                          onKeyDown={handleComposerKeyDown}
                          rows={1}
                          placeholder="Digite sua mensagem..."
                          className="h-11 w-full resize-none rounded-[999px] border border-[var(--color-border-soft)] bg-white pb-[9px] pl-12 pr-12 pt-[9px] text-sm leading-[22px] text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />

                        <button
                          type="button"
                          className="absolute left-[6px] top-[22px] inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/5 text-black/70 transition hover:bg-black/10"
                          onClick={() => composerFileInputRef.current?.click()}
                          aria-label="Anexar arquivos"
                        >
                          <Paperclip size={14} />
                        </button>

                        <button
                          type="button"
                          className="absolute right-[6px] top-[22px] inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void submitMessage()}
                          disabled={sending || (composerText.trim().length === 0 && composerFiles.length === 0)}
                          aria-label="Enviar mensagem"
                        >
                          {sending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
                        </button>

                        <label className="sr-only">
                          Anexar arquivos
                          <input
                            ref={composerFileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            onChange={handlePickFiles}
                            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/aac,audio/ogg,image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {canUsePortal && messageImageLightbox && activeLightboxAttachment
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
              role="dialog"
              aria-modal="true"
              onClick={() => setMessageImageLightbox(null)}
            >
              <button
                type="button"
                onClick={() => setMessageImageLightbox(null)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/55 text-white transition hover:bg-black/75"
                aria-label="Fechar visualizador"
              >
                <X size={18} />
              </button>

              {messageImageLightbox.items.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      previousLightboxImage();
                    }}
                    className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/55 text-white transition hover:bg-black/75"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      nextLightboxImage();
                    }}
                    className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/55 text-white transition hover:bg-black/75"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              ) : null}

              <div className="relative h-[88vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
                {activeLightboxUrl ? (
                  <Image src={activeLightboxUrl} alt="Imagem da conversa ampliada" fill unoptimized className="object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-white/80">Preview indisponível</div>
                )}
              </div>

              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                {messageImageLightbox.index + 1} / {messageImageLightbox.items.length}
              </p>
            </div>,
            document.body
          )
        : null}

      {showRenameContactModal && activeConversation ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-[14px] border border-[var(--color-border-soft)] bg-white p-4 shadow-xl">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Renomear contato</p>
              <p className="text-xs text-black/60">
                Nome atual: <span className="font-semibold text-black/75">{resolvePeerBaseName(activeConversation)}</span>
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={renameContactValue}
                onChange={(event) => setRenameContactValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitPeerRename();
                  }
                }}
                autoFocus
                maxLength={80}
                placeholder="Digite um apelido personalizado"
                className="w-full rounded-[10px] border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <p className="text-[11px] text-black/55">Deixe em branco para remover o apelido.</p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  if (renamingContact) {
                    return;
                  }
                  setShowRenameContactModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void submitPeerRename()} disabled={renamingContact}>
                {renamingContact ? <Loader2 size={14} className="animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ChatImageAttachmentGridProps = {
  attachments: ChatAttachment[];
  onOpen: (index: number) => void;
};

function ChatImageAttachmentGrid({ attachments, onOpen }: ChatImageAttachmentGridProps) {
  const visibleAttachments = attachments.slice(0, 4);
  const overflowCount = Math.max(0, attachments.length - visibleAttachments.length);
  const isSingle = attachments.length === 1;

  return (
    <div className={`mt-2 grid gap-1.5 ${isSingle ? "grid-cols-1 w-[200px]" : "max-w-full w-[406px] grid-cols-2"}`}>
      {visibleAttachments.map((attachment, index) => {
        const mediaUrl = resolveMediaUrl(attachment.media_path);
        const showOverflow = overflowCount > 0 && index === visibleAttachments.length - 1;

        return (
          <button
            key={attachment.id}
            type="button"
            onClick={() => onOpen(index)}
            className={`group relative cursor-pointer overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-black/5 ${
              isSingle ? "h-[200px] w-[200px]" : "h-[200px] w-full"
            }`}
          >
            {mediaUrl ? (
              <Image
                src={mediaUrl}
                alt={attachment.original_name?.trim() || `Imagem ${index + 1}`}
                fill
                unoptimized
                className="object-cover transition group-hover:scale-[1.02]"
              />
            ) : (
              <span className="flex h-full items-center justify-center px-3 text-center text-xs font-semibold text-black/60">
                Sem preview
              </span>
            )}

            {showOverflow ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-black text-white">
                +{overflowCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type ChatAudioAttachmentPlayerProps = {
  attachment: ChatAttachment;
};

function ChatAudioAttachmentPlayer({ attachment }: ChatAudioAttachmentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const mediaUrl = resolveMediaUrl(attachment.media_path);
  const canPlay = Boolean(mediaUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
  }

  function handleSeek(nextValue: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  if (!canPlay) {
    return (
      <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-black/[0.03] px-3 py-2 text-xs text-black/60">
        Áudio indisponível
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-[10px] border border-[var(--color-border-soft)] bg-black/[0.03] px-3 py-2.5">
      <audio ref={audioRef} src={mediaUrl ?? undefined} preload="metadata" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white text-black/75 hover:bg-black/5"
          aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[var(--color-primary)]"
          aria-label="Progresso do áudio"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-black/65">
        <span>
          {formatAudioClock(currentTime)} / {formatAudioClock(duration)}
        </span>
      </div>
    </div>
  );
}

function parseReplyBody(body: string | null | undefined): { replyToMessageId: number | null; text: string } {
  if (!body) {
    return { replyToMessageId: null, text: "" };
  }

  const match = body.match(CHAT_REPLY_MARKER_PATTERN);
  if (!match) {
    return { replyToMessageId: null, text: body };
  }

  const parsedReplyId = Number.parseInt(match[1] ?? "", 10);
  return {
    replyToMessageId: Number.isFinite(parsedReplyId) && parsedReplyId > 0 ? parsedReplyId : null,
    text: body.replace(CHAT_REPLY_MARKER_PATTERN, ""),
  };
}

function formatAudioClock(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildReplyBody(body: string, replyToMessageId: number | null): string | null {
  const normalizedBody = body.trim();

  if (replyToMessageId && replyToMessageId > 0) {
    return normalizedBody.length > 0
      ? `[[reply:${replyToMessageId}]]\n${normalizedBody}`
      : `[[reply:${replyToMessageId}]]`;
  }

  return normalizedBody.length > 0 ? normalizedBody : null;
}

function messageReplyPreview(message: ChatMessage | null, fallback: string): string {
  if (!message) {
    return fallback;
  }

  if (message.is_deleted) {
    return "Mensagem removida";
  }

  const parsed = parseReplyBody(message.body);
  const text = parsed.text.trim();
  if (text.length > 0) {
    return text;
  }

  if (message.attachments.length > 0) {
    return `${message.attachments.length} anexo(s)`;
  }

  return fallback;
}

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderStatusIndicator(message: ChatMessage) {
  if (message.status === "received_read") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-violet-600">
        <CheckCheck size={13} />
      </span>
    );
  }

  if (message.status === "received_unread") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-black/55">
        <CheckCheck size={13} />
      </span>
    );
  }

  if (message.status === "sent_not_received") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-black/55">
        <Check size={13} />
      </span>
    );
  }

  return null;
}
