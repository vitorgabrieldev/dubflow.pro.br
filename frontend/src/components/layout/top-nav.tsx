"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  Clapperboard,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  ListVideo,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  Mic2,
  RadioTower,
  Search,
  UserRound,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/api";
import { LOCALE_META, SUPPORTED_LOCALES, type Locale, getDictionary } from "@/lib/i18n";
import type { UserPreview } from "@/types/api";

type TopNavProps = {
  locale: Locale;
  isAuthenticated: boolean;
  currentUser?: UserPreview | null;
  compactMode?: boolean;
};

export function TopNav({ locale, isAuthenticated, currentUser, compactMode = false }: TopNavProps) {
  const t = getDictionary(locale);
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const basePath = `/${locale}`;
  const hideOnMobile = pathname === `${basePath}/entrar` || pathname === `${basePath}/criar-conta`;
  const [resolvedUser, setResolvedUser] = useState<UserPreview | null>(currentUser ?? null);
  const [isResolvingUser, setIsResolvingUser] = useState(isAuthenticated && !currentUser);

  useEffect(() => {
    setResolvedUser(currentUser ?? null);
    setIsResolvingUser(isAuthenticated && !currentUser);
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || resolvedUser) {
      return;
    }

    let cancelled = false;

    const loadSessionUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setResolvedUser(null);
          }
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as { user?: UserPreview | null };
        if (!cancelled) {
          setResolvedUser(payload.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setResolvedUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingUser(false);
        }
      }
    };

    void loadSessionUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, resolvedUser]);

  const hasSessionUser = isAuthenticated && Boolean(resolvedUser);
  const profileName = resolvedUser?.stage_name?.trim() || resolvedUser?.name || "Conta";
  const profileHandle = resolvedUser?.username ? `@${resolvedUser.username}` : null;
  const profileAvatar = resolveMediaUrl(resolvedUser?.avatar_path);
  const isCreateOpportunityRoute =
    pathname.startsWith(`${basePath}/organizations/`) && pathname.includes("/oportunidades/novo");
  const publishActive =
    isActivePath(pathname, `${basePath}/publicar`) ||
    isActivePath(pathname, `${basePath}/nova-playlist`) ||
    isActivePath(pathname, `${basePath}/nova-organizacao`) ||
    isCreateOpportunityRoute;
  if (compactMode) {
    return (
      <header data-top-nav="1" className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0c10]/95 backdrop-blur-xl">
        <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href={basePath} className="inline-flex items-center">
              <Image src="/logos/logo-cor.png" alt="DubFlow" width={126} height={40} className="h-8 w-auto" priority />
              <span className="sr-only">{t.appName}</span>
            </Link>

            <div className="flex items-center gap-2">
              {hasSessionUser ? (
                <ProfileDropdown
                  locale={locale}
                  name={profileName}
                  handle={profileHandle}
                  avatar={profileAvatar}
                  compactMode
                />
              ) : isAuthenticated && isResolvingUser ? (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/15 bg-white/10 text-white">
                  <Loader2 size={16} className="animate-spin" />
                </span>
              ) : (
                <Link
                  href={`${basePath}/entrar`}
                  aria-label={t.auth.login}
                  title={t.auth.login}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/15 bg-white/10 text-white"
                >
                  <UserRound size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        data-top-nav="1"
        className={`${hideOnMobile ? "hidden lg:block " : ""}sticky top-0 z-30 border-b border-[var(--color-border-soft)] bg-white/80 backdrop-blur-xl`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={basePath}
              className="inline-flex items-center gap-2 rounded-[8px] bg-transparent px-0 py-0 text-lg font-semibold tracking-tight text-[var(--color-ink)] ring-0 sm:bg-white sm:px-2 sm:py-1 sm:ring-1 sm:ring-[var(--color-border-soft)]"
            >
              <Image src="/logos/logo-cor.png" alt="DubFlow" width={126} height={40} className="h-8 w-auto" priority />
              <span className="sr-only">{t.appName}</span>
            </Link>

            <SearchHeaderInput
              locale={locale}
              className="hidden flex-1 lg:flex"
              onSubmit={(term) => {
                router.push(`${basePath}/buscar?q=${encodeURIComponent(term)}`);
              }}
            />

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LocaleDropdown locale={locale} />
              </div>

              {hasSessionUser ? (
                <>
                  <div className="hidden lg:contents">
                    <NotificationsIconLink
                      href={`${basePath}/notificacoes`}
                      locale={locale}
                      icon={<Bell size={16} />}
                      label={t.nav.notifications}
                      active={isActivePath(pathname, `${basePath}/notificacoes`)}
                    />
                    <IconLink
                      href={`${basePath}/mensagens`}
                      icon={<MessageCircle size={16} />}
                      label="Mensagens"
                      active={isActivePath(pathname, `${basePath}/mensagens`)}
                    />
                    <IconLink
                      href={`${basePath}/painel`}
                      icon={<LayoutDashboard size={16} />}
                      label={t.nav.dashboard}
                      active={isActivePath(pathname, `${basePath}/painel`)}
                    />
                  </div>
                  <ProfileDropdown locale={locale} name={profileName} handle={profileHandle} avatar={profileAvatar} />
                </>
              ) : isAuthenticated && isResolvingUser ? (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-white ring-1 ring-[var(--color-border-soft)]">
                  <Loader2 size={16} className="animate-spin text-black/50" />
                </span>
              ) : (
                <>
                  <div className="hidden items-center gap-2 lg:flex">
                    <Link
                      href={`${basePath}/entrar`}
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-border-soft)] transition hover:bg-[var(--color-primary-soft)]"
                    >
                      <LogIn size={15} />
                      {t.auth.login}
                    </Link>
                    <Link
                      href={`${basePath}/criar-conta`}
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-strong)_100%)] px-3 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(147,51,234,0.8)] transition hover:opacity-95"
                    >
                      <UserPlus size={15} />
                      {t.auth.signup}
                    </Link>
                  </div>

                  <Link
                    href={`${basePath}/entrar`}
                    aria-label={t.auth.login}
                    title={t.auth.login}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-[var(--color-ink)] ring-1 ring-[var(--color-border-soft)] lg:hidden"
                  >
                    <UserRound size={16} />
                  </Link>
                </>
              )}
            </div>
          </div>

          <nav className="mt-4 hidden items-center gap-1 lg:flex">
            <NavItem
              href={basePath}
              icon={<RadioTower size={15} />}
              label={t.nav.feed}
              active={pathname === basePath}
            />
            <NavItem
              href={`${basePath}/comunidades`}
              icon={<Users size={15} />}
              label={t.nav.organizations}
              active={isActivePath(pathname, `${basePath}/comunidades`)}
            />
            <NavItem
              href={`${basePath}/oportunidades`}
              icon={<Mic2 size={15} />}
              label={t.nav.opportunities}
              active={isActivePath(pathname, `${basePath}/oportunidades`)}
            />
            {hasSessionUser ? (
              <PublishDropdown
                locale={locale}
                label={t.nav.publish}
                active={publishActive}
              />
            ) : null}
          </nav>
        </div>
      </header>

      <MobileBottomBar locale={locale} pathname={pathname} hide={hideOnMobile} hasSessionUser={hasSessionUser} />
    </>
  );
}

function SearchHeaderInput({
  locale,
  className,
  onSubmit,
}: {
  locale: Locale;
  className?: string;
  onSubmit: (term: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) {
          return;
        }
        onSubmit(trimmed);
      }}
    >
      <label htmlFor={`global-search-${locale}`} className="sr-only">
        Buscar
      </label>
      <div className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-[var(--color-border-soft)] bg-white px-3 shadow-sm">
        <Search size={16} className="text-black/45" />
        <input
          id={`global-search-${locale}`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar no DubFlow..."
          className="w-full bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-black/45"
        />
      </div>
    </form>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm ring-1 transition ${
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-[var(--color-border-soft)]"
          : "text-black/70 ring-transparent hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-ink)] hover:ring-[var(--color-border-soft)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function IconLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-[8px] ring-1 transition ${
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-[var(--color-border-soft)]"
          : "bg-white text-black/75 ring-[var(--color-border-soft)] hover:bg-[var(--color-primary-soft)]"
      }`}
    >
      {icon}
    </Link>
  );
}

function MobileBottomBar({
  locale,
  pathname,
  hide,
  hasSessionUser,
}: {
  locale: Locale;
  pathname: string;
  hide: boolean;
  hasSessionUser: boolean;
}) {
  if (hide) {
    return null;
  }

  const basePath = `/${locale}`;
  const items = hasSessionUser
    ? [
        { href: basePath, icon: <RadioTower size={20} />, label: "Feed", active: pathname === basePath },
        {
          href: `${basePath}/comunidades`,
          icon: <Users size={20} />,
          label: "Comunidades",
          active: isActivePath(pathname, `${basePath}/comunidades`),
        },
        {
          href: `${basePath}/oportunidades`,
          icon: <Mic2 size={20} />,
          label: "Oportunidades",
          active: isActivePath(pathname, `${basePath}/oportunidades`),
        },
        {
          href: `${basePath}/playlists`,
          icon: <ListVideo size={20} />,
          label: "Playlists",
          active: isActivePath(pathname, `${basePath}/playlists`),
        },
        {
          href: `${basePath}/mensagens`,
          icon: <MessageCircle size={20} />,
          label: "Mensagens",
          active: isActivePath(pathname, `${basePath}/mensagens`),
        },
        {
          href: `${basePath}/notificacoes`,
          icon: <Bell size={20} />,
          label: "Alertas",
          active: isActivePath(pathname, `${basePath}/notificacoes`),
        },
      ]
    : [
        { href: basePath, icon: <RadioTower size={20} />, label: "Feed", active: pathname === basePath },
        {
          href: `${basePath}/comunidades`,
          icon: <Users size={20} />,
          label: "Comunidades",
          active: isActivePath(pathname, `${basePath}/comunidades`),
        },
        {
          href: `${basePath}/oportunidades`,
          icon: <Mic2 size={20} />,
          label: "Oportunidades",
          active: isActivePath(pathname, `${basePath}/oportunidades`),
        },
        {
          href: `${basePath}/playlists`,
          icon: <ListVideo size={20} />,
          label: "Playlists",
          active: isActivePath(pathname, `${basePath}/playlists`),
        },
        {
          href: `${basePath}/entrar`,
          icon: <LogIn size={20} />,
          label: "Entrar",
          active: isActivePath(pathname, `${basePath}/entrar`),
        },
        {
          href: `${basePath}/criar-conta`,
          icon: <UserPlus size={20} />,
          label: "Criar",
          active: isActivePath(pathname, `${basePath}/criar-conta`),
        },
      ];
  const activeIndex = items.findIndex((item) => item.active);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-soft)] bg-white/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto w-full max-w-7xl px-2 pb-[max(env(safe-area-inset-bottom),0px)] pt-2">
        <div className="relative">
          <span
            className={`pointer-events-none absolute left-0 top-1 z-0 h-[50px] w-[calc(100%/6)] rounded-[10px] bg-[var(--color-primary-soft)] shadow-[0_10px_20px_-16px_rgba(126,34,206,0.9)] transition-all duration-300 ease-out ${
              activeIndex >= 0 ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundColor: "#d8b4fe",
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%) translateY(-4px)`,
            }}
          />

          <nav className="relative z-10 grid grid-cols-6">
            {items.map((item) => (
              <BottomNavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={item.active} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function BottomNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-[58px] items-center justify-center rounded-[8px] px-1 py-1 transition-all duration-300 ease-out ${
        active
          ? "-translate-y-1.5 text-[#7e22ce]"
          : "translate-y-0 text-black/65 hover:text-[var(--color-ink)]"
      }`}
    >
      {icon}
    </Link>
  );
}

type LiveNotificationsPayload = {
  unread_count?: number;
  latest_unread?: {
    id?: string;
    title?: string | null;
    message?: string | null;
  } | null;
};

const NOTIFICATIONS_POLL_INTERVAL_MS = 15_000;

function NotificationsIconLink({
  href,
  locale,
  icon,
  label,
  active,
}: {
  href: string;
  locale: Locale;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasHydrated = useRef(false);
  const lastUnreadCount = useRef(0);
  const lastToastNotificationId = useRef<string | null>(null);
  const isPolling = useRef(false);

  const pollNotifications = useCallback(async () => {
    if (isPolling.current) {
      return;
    }

    isPolling.current = true;

    try {
      const response = await fetch("/api/notifications/live", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as LiveNotificationsPayload;
      const nextUnreadCount = Number(payload.unread_count ?? 0);
      const latestUnreadId = payload.latest_unread?.id ?? null;

      if (
        hasHydrated.current &&
        nextUnreadCount > lastUnreadCount.current &&
        latestUnreadId &&
        latestUnreadId !== lastToastNotificationId.current &&
        !active
      ) {
        setToastMessage(payload.latest_unread?.title?.trim() || notificationToastLabel(locale));
      }

      setUnreadCount(nextUnreadCount);
      lastUnreadCount.current = nextUnreadCount;
      if (latestUnreadId) {
        lastToastNotificationId.current = latestUnreadId;
      }
      hasHydrated.current = true;
    } catch {
      // Keep current count when polling fails.
    } finally {
      isPolling.current = false;
    }
  }, [active, locale]);

  useEffect(() => {
    const bootstrapId = window.setTimeout(() => {
      void pollNotifications();
    }, 0);

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void pollNotifications();
    }, NOTIFICATIONS_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void pollNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(bootstrapId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pollNotifications]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <Link
        href={href}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[8px] ring-1 transition ${
          active
            ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-[var(--color-border-soft)]"
            : "bg-white text-black/75 ring-[var(--color-border-soft)] hover:bg-[var(--color-primary-soft)]"
        }`}
      >
        {icon}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badgeLabel}
          </span>
        ) : null}
      </Link>

      {toastMessage ? (
        <span className="pointer-events-none fixed right-4 top-20 z-50 inline-flex max-w-[280px] rounded-[8px] bg-[var(--color-ink)] px-3 py-2 text-xs font-semibold text-white shadow-xl">
          {toastMessage}
        </span>
      ) : null}
    </>
  );
}

function notificationToastLabel(locale: Locale): string {
  switch (locale) {
    case "en":
      return "You have new notifications";
    case "es":
      return "Tienes nuevas notificaciones";
    case "ja":
      return "新しい通知があります";
    case "fr":
      return "Vous avez de nouvelles notifications";
    default:
      return "Você tem novas notificações";
  }
}

function ProfileDropdown({
  locale,
  name,
  handle,
  avatar,
  compactMode = false,
}: {
  locale: Locale;
  name: string;
  handle: string | null;
  avatar: string | null;
  compactMode?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const closeDropdown = useCallback(() => {
    if (!isOpen || isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 160);
  }, [isClosing, isOpen]);

  useEffect(() => {
    function handleOutside(event: globalThis.MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        closeDropdown();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDropdown]);

  function openDropdown() {
    setIsClosing(false);
    setIsOpen(true);
  }

  function handleToggle() {
    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  }

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();

    if (!isOpen) {
      router.push(href);
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      router.push(href);
    }, 160);
  }

  const shouldRenderMenu = isOpen || isClosing;
  const isVisible = isOpen && !isClosing;
  const topLabel = handle ?? name;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] px-2 text-sm font-medium transition ${
          compactMode
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "bg-white text-black/75 ring-1 ring-[var(--color-border-soft)] hover:bg-[var(--color-primary-soft)]"
        }`}
      >
        <Avatar src={avatar} name={name} size="sm" />
        <span className={`inline max-w-[140px] truncate text-[13px] font-semibold ${compactMode ? "text-white" : "text-[var(--color-ink)]"}`}>
          {topLabel}
        </span>
        <ChevronDown size={14} />
      </button>

      {shouldRenderMenu ? (
        <div
          className={`absolute right-0 mt-2 w-64 origin-top-right rounded-[8px] border p-2 shadow-[0_20px_44px_-26px_rgba(76,16,140,0.5)] transition-all duration-150 ease-out ${
            compactMode
              ? "border-white/15 bg-[#12151b] text-white"
              : "border-[var(--color-border-soft)] bg-white"
          } ${
            isVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0"
          }`}
        >
          <Link
            href={`/${locale}/perfil`}
            onClick={(event) => handleNavigate(event, `/${locale}/perfil`)}
            className={`flex items-center gap-2 rounded-[6px] px-3 py-2 ${compactMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
          >
            <Avatar src={avatar} name={name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-semibold ${compactMode ? "text-white" : "text-[var(--color-ink)]"}`}>{name}</span>
              <span className={`block truncate text-xs ${compactMode ? "text-white/60" : "text-black/55"}`}>{handle ?? "Meu perfil"}</span>
            </span>
            <UserRound size={14} className={compactMode ? "text-white/60" : "text-black/50"} />
          </Link>

          <div className={`my-1 border-t ${compactMode ? "border-white/10" : "border-black/10"}`} />

          <Link
            href={`/${locale}/minhas-organizacoes`}
            onClick={(event) => handleNavigate(event, `/${locale}/minhas-organizacoes`)}
            className={`flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm ${compactMode ? "text-white/85 hover:bg-white/10" : "text-black/75 hover:bg-black/5"}`}
          >
            <Building2 size={14} />
            Minhas comunidades
          </Link>

          <Link
            href={`/${locale}/alterar-senha`}
            onClick={(event) => handleNavigate(event, `/${locale}/alterar-senha`)}
            className={`flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm ${compactMode ? "text-white/85 hover:bg-white/10" : "text-black/75 hover:bg-black/5"}`}
          >
            <KeyRound size={14} />
            Alterar senha
          </Link>

          <form action="/api/auth/logout" method="post">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
            >
              <LogOut size={14} />
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function PublishDropdown({
  locale,
  label,
  active,
}: {
  locale: Locale;
  label: string;
  active: boolean;
}) {
  type OrganizationOption = {
    id: number;
    name: string;
    slug: string;
    role: "owner" | "admin" | "editor" | "member" | null;
  };

  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);
  const [manageableOrganizations, setManageableOrganizations] = useState<OrganizationOption[]>([]);

  const closeDropdown = useCallback(() => {
    if (!isOpen || isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setShowOrganizations(false);
      setOrganizationsError(null);
    }, 160);
  }, [isClosing, isOpen]);

  useEffect(() => {
    function handleOutside(event: globalThis.MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        closeDropdown();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDropdown]);

  function openDropdown() {
    setIsClosing(false);
    setIsOpen(true);
  }

  function handleToggle() {
    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  }

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();

    if (!isOpen) {
      router.push(href);
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setShowOrganizations(false);
      setOrganizationsError(null);
      router.push(href);
    }, 160);
  }

  async function loadManageableOrganizations() {
    if (isLoadingOrganizations) {
      return;
    }

    setIsLoadingOrganizations(true);
    setOrganizationsError(null);

    try {
      const response = await fetch("/api/organizations/my-organizations?per_page=50", {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        data?: Array<{
          id: number;
          name: string;
          slug: string;
          viewer?: {
            role?: string | null;
          };
        }>;
        message?: string;
      };

      if (!response.ok) {
        setManageableOrganizations([]);
        setOrganizationsError(payload.message?.trim() || "Não foi possível carregar suas comunidades.");
        return;
      }

      setManageableOrganizations(
        (payload.data ?? []).map((organization) => ({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role:
            organization.viewer?.role === "owner" ||
            organization.viewer?.role === "admin" ||
            organization.viewer?.role === "editor" ||
            organization.viewer?.role === "member"
              ? organization.viewer.role
              : null,
        }))
      );
    } catch {
      setManageableOrganizations([]);
      setOrganizationsError("Não foi possível carregar suas comunidades.");
    } finally {
      setIsLoadingOrganizations(false);
    }
  }

  function handleOpenOrganizations() {
    setShowOrganizations(true);
    if (manageableOrganizations.length === 0) {
      void loadManageableOrganizations();
    }
  }

  const organizationsForMode = manageableOrganizations.filter(
    (organization) => organization.role === "owner" || organization.role === "admin"
  );

  const shouldRenderMenu = isOpen || isClosing;
  const isVisible = isOpen && !isClosing;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] px-3 py-2 text-sm ring-1 transition ${
          active
            ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-[var(--color-border-soft)]"
            : "text-black/70 ring-transparent hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-ink)] hover:ring-[var(--color-border-soft)]"
        }`}
      >
        <Clapperboard size={15} />
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>

      {shouldRenderMenu ? (
        <div
          className={`absolute left-0 mt-2 w-56 origin-top-left rounded-[8px] border border-[var(--color-border-soft)] bg-white p-2 shadow-[0_20px_44px_-26px_rgba(76,16,140,0.5)] transition-all duration-150 ease-out ${
            isVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0"
          }`}
        >
          {showOrganizations ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShowOrganizations(false);
                              setOrganizationsError(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-left text-sm text-black/75 hover:bg-black/5"
              >
                <ArrowLeft size={14} className="text-black/55" />
                Voltar
              </button>

              <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-black/45">
                Suas comunidades
              </p>

              {isLoadingOrganizations ? (
                <p className="inline-flex w-full items-center gap-2 px-3 py-2 text-xs text-black/60">
                  <Loader2 size={12} className="animate-spin" />
                  Carregando comunidades...
                </p>
              ) : organizationsError ? (
                <p className="px-3 py-2 text-xs text-red-700">{organizationsError}</p>
              ) : organizationsForMode.length === 0 ? (
                <p className="px-3 py-2 text-xs text-black/60">
                  Você não tem comunidades com permissão para criar teste.
                </p>
              ) : (
                organizationsForMode.map((organization) => (
                  <Link
                    key={organization.id}
                    href={`/${locale}/organizations/${organization.slug}/oportunidades/novo`}
                    onClick={(event) =>
                      handleNavigate(event, `/${locale}/organizations/${organization.slug}/oportunidades/novo`)
                    }
                    className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                  >
                    <Building2 size={14} className="shrink-0 text-black/55" />
                    <span className="line-clamp-1">{organization.name}</span>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <>
              <Link
                href={`/${locale}/publicar`}
                onClick={(event) => handleNavigate(event, `/${locale}/publicar`)}
                className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm text-black/80 hover:bg-black/5"
              >
                <Clapperboard size={14} className="text-black/55" />
                Episódio
              </Link>

              <button
                type="button"
                onClick={() => handleOpenOrganizations()}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-left text-sm text-black/80 hover:bg-black/5"
              >
                <Mic2 size={14} className="text-black/55" />
                Oportunidade
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LocaleDropdown({ locale }: { locale: Locale }) {
  const current = LOCALE_META[locale];

  return (
    <details className="relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-1 rounded-[8px] bg-white px-3 text-sm font-medium text-black/75 ring-1 ring-[var(--color-border-soft)] hover:bg-[var(--color-primary-soft)] [&::-webkit-details-marker]:hidden">
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs text-black/45">▾</span>
      </summary>

      <div className="absolute right-0 mt-2 w-52 rounded-[8px] border border-[var(--color-border-soft)] bg-white p-1 shadow-[0_20px_44px_-26px_rgba(76,16,140,0.5)]">
        {SUPPORTED_LOCALES.map((item) => {
          const meta = LOCALE_META[item];

          return (
            <Link
              key={item}
              href={`/${item}`}
              className={`flex items-center justify-between rounded-[6px] px-3 py-2 text-sm transition ${
                item === locale ? "bg-[var(--color-primary)] text-white" : "text-black/80 hover:bg-black/5"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>{meta.flag}</span>
                <span>{meta.label}</span>
              </span>
              <span className="text-xs opacity-75">{item}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
