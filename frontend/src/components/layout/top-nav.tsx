"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Clapperboard,
  ChevronDown,
  LayoutDashboard,
  ListVideo,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  MessageCircle,
  Mic2,
  RadioTower,
  Search,
  Trash2,
  Trophy,
  UserRound,
  UserPlus,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/api";
import { type Locale, getDictionary } from "@/lib/i18n";
import { resolveNotificationAction, resolveNotificationContext, resolveNotificationIconKey } from "@/lib/notifications";
import type { NotificationItem, UserPreview } from "@/types/api";

type TopNavProps = {
  locale: Locale;
  isAuthenticated: boolean;
  currentUser?: UserPreview | null;
  compactMode?: boolean;
};

type AnimatedMenuIconProps = {
  staticIcon: ReactNode;
  gifSrc: string;
  gifAlt: string;
  size?: number;
  playDurationMs?: number;
  triggerKey?: number;
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
  const feedTabActive = pathname === basePath;
  const communitiesTabActive = isActivePath(pathname, `${basePath}/comunidades`);
  const opportunitiesTabActive = isActivePath(pathname, `${basePath}/oportunidades`);

  useEffect(() => {
    const routes = [`${basePath}`, `${basePath}/comunidades`, `${basePath}/oportunidades`];
    if (hasSessionUser) {
      routes.push(`${basePath}/mensagens`, `${basePath}/notificacoes`, `${basePath}/painel`, `${basePath}/publicar`);
    }

    routes.forEach((route) => {
      void router.prefetch(route);
    });
  }, [basePath, hasSessionUser, router]);
  if (compactMode) {
    return (
      <header data-top-nav="1" className="sticky top-0 z-30 border-b border-[var(--color-border-soft)] bg-white">
        <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href={basePath} className="inline-flex items-center">
              <Image src="/logos/logo-cor.png" alt="DubFlow" width={158} height={50} className="h-10 w-auto" priority />
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
      <header data-top-nav="1" className={`${hideOnMobile ? "hidden lg:block " : ""}sticky top-0 z-30 bg-white`}>
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8 lg:py-4 lg:pb-0">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={basePath}
              className="inline-flex items-center gap-2 bg-transparent px-0 py-0 text-lg font-semibold tracking-tight text-[var(--color-ink)] lg:mr-4"
            >
              <Image src="/logos/logo-cor.png" alt="DubFlow" width={158} height={50} className="h-10 w-auto" priority />
              <span className="sr-only">{t.appName}</span>
            </Link>

            <SearchHeaderInput
              locale={locale}
              className="hidden flex-1 lg:flex"
              tourId="home-search"
              onSubmit={(term) => {
                router.push(`${basePath}/buscar?q=${encodeURIComponent(term)}`);
              }}
            />

            <div className="flex items-center gap-2">
              {hasSessionUser ? (
                <>
                  <div className="hidden items-center gap-2 lg:flex" data-tour-id="home-nav-actions">
                    <NotificationsIconLink
                      href={`${basePath}/notificacoes`}
                      locale={locale}
                      icon={<Bell size={16} />}
                      label={t.nav.notifications}
                      tourId="home-nav-notifications"
                      active={isActivePath(pathname, `${basePath}/notificacoes`)}
                    />
                    <IconLink
                      href={`${basePath}/mensagens`}
                      icon={<MessageCircle size={16} />}
                      label="Mensagens"
                      tourId="home-nav-messages"
                      active={isActivePath(pathname, `${basePath}/mensagens`)}
                    />
                    <IconLink
                      href={`${basePath}/painel`}
                      icon={<LayoutDashboard size={16} />}
                      label={t.nav.dashboard}
                      tourId="home-nav-dashboard"
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
                  <div className="hidden items-center gap-2 lg:flex" data-tour-id="home-auth-actions">
                    <Link
                      href={`${basePath}/entrar`}
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] ring-1 ring-[var(--color-border-soft)] transition hover:bg-[var(--color-primary-soft)]"
                    >
                      <LogIn size={15} />
                      {t.auth.login}
                    </Link>
                    <Link
                      href={`${basePath}/criar-conta`}
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-strong)_100%)] px-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(147,51,234,0.8)] transition hover:opacity-95"
                    >
                      <UserPlus size={16} className="text-white" />
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

          <nav className="mt-5 hidden items-end gap-2 border-b border-[var(--color-border-soft)] lg:flex">
            <NavItem
              href={basePath}
              animatedIcon={{
                staticIcon: <RadioTower size={22} className="text-[#f97316]" />,
                gifSrc: "/nav-gifs/feed.gif",
                gifAlt: "Feed",
                size: 22,
                playDurationMs: 1700,
              }}
              label={t.nav.feed}
              tourId="home-nav-feed"
              active={feedTabActive}
            />
            <NavItem
              href={`${basePath}/comunidades`}
              animatedIcon={{
                staticIcon: <Users size={22} className="text-[#0ea5e9]" />,
                gifSrc: "/nav-gifs/communities.gif",
                gifAlt: "Comunidades",
                size: 22,
                playDurationMs: 1700,
              }}
              label={t.nav.organizations}
              tourId="home-nav-communities"
              active={communitiesTabActive}
            />
            <NavItem
              href={`${basePath}/oportunidades`}
              animatedIcon={{
                staticIcon: <Mic2 size={22} className="text-[#ef4444]" />,
                gifSrc: "/nav-gifs/opportunities.gif",
                gifAlt: "Oportunidades",
                size: 22,
                playDurationMs: 1700,
              }}
              label={t.nav.opportunities}
              tourId="home-nav-opportunities"
              active={opportunitiesTabActive}
            />
            {hasSessionUser ? (
              <PublishDropdown
                locale={locale}
                label={t.nav.publish}
                tourId="home-nav-publish"
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

function AnimatedMenuIcon({
  gifSrc,
  gifAlt,
  size = 16,
  playDurationMs = 1400,
  triggerKey = 0,
}: AnimatedMenuIconProps) {
  const [posterSrc, setPosterSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGifReady, setIsGifReady] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const playTimeoutRef = useRef<number | null>(null);
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const image = new window.Image();
    image.decoding = "async";
    image.src = gifSrc;
    image.onload = () => {
      if (cancelled) {
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, image.naturalWidth || size);
        canvas.height = Math.max(1, image.naturalHeight || size);
        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          if (red > 245 && green > 245 && blue > 245) {
            pixels[index + 3] = 0;
          }
        }
        context.putImageData(imageData, 0, 0);
        setPosterSrc(canvas.toDataURL("image/png"));
      } catch {
        setPosterSrc(null);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [gifSrc, size]);

  useEffect(() => {
    return () => {
      if (playTimeoutRef.current !== null) {
        window.clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      isLockedRef.current = false;
    };
  }, []);

  const playOnce = useCallback(() => {
    if (isLockedRef.current) {
      return;
    }

    isLockedRef.current = true;
    setIsGifReady(false);
    setIsPlaying(true);
    setPlayCount((current) => current + 1);

    if (playTimeoutRef.current !== null) {
      window.clearTimeout(playTimeoutRef.current);
    }

    playTimeoutRef.current = window.setTimeout(() => {
      setIsPlaying(false);
      isLockedRef.current = false;
      playTimeoutRef.current = null;
    }, playDurationMs);
  }, [playDurationMs]);

  useEffect(() => {
    if (triggerKey <= 0) {
      return;
    }

    const triggerId = window.setTimeout(() => {
      playOnce();
    }, 0);

    return () => {
      window.clearTimeout(triggerId);
    };
  }, [playOnce, triggerKey]);

  return (
    <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
      <span
        className={`absolute inset-0 inline-flex items-center justify-center transition-all duration-200 ease-out ${
          isPlaying && isGifReady ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={gifAlt}
            width={size}
            height={size}
            unoptimized
            className="h-full w-full object-contain mix-blend-multiply"
          />
        ) : (
          <span
            aria-hidden
            className="skeleton-shimmer inline-flex rounded-[6px] bg-black/10"
            style={{ width: Math.max(12, size - 2), height: Math.max(12, size - 2) }}
          />
        )}
      </span>
      {isPlaying ? (
        <span
          className={`absolute inset-0 inline-flex items-center justify-center transition-opacity duration-150 ${
            isGifReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            key={`${gifSrc}-${playCount}`}
            src={gifSrc}
            alt={gifAlt}
            width={size}
            height={size}
            unoptimized
            onLoad={() => setIsGifReady(true)}
            onError={() => {
              setIsPlaying(false);
              setIsGifReady(false);
              isLockedRef.current = false;
            }}
            className="h-full w-full object-contain mix-blend-multiply"
          />
        </span>
      ) : null}
    </span>
  );
}

function SearchHeaderInput({
  locale,
  className,
  tourId,
  onSubmit,
}: {
  locale: Locale;
  className?: string;
  tourId?: string;
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
      <div
        data-tour-id={tourId}
        className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-[var(--color-border-soft)] bg-white px-3 shadow-sm"
      >
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

function NavItem({
  href,
  animatedIcon,
  label,
  active,
  tourId,
}: {
  href: string;
  animatedIcon: Omit<AnimatedMenuIconProps, "triggerKey">;
  label: string;
  active: boolean;
  tourId?: string;
}) {
  const [hoverTick, setHoverTick] = useState(0);

  return (
    <Link
      prefetch
      href={href}
      data-tour-id={tourId}
      onMouseEnter={() => setHoverTick((current) => current + 1)}
      onFocus={() => setHoverTick((current) => current + 1)}
      className={`group inline-flex -mb-px items-center gap-2.5 rounded-t-[10px] border-x border-t px-3.5 pb-[7px] pt-[7px] text-[17px] transition-colors duration-200 ease-out ${
        active
          ? "border-[var(--color-border-soft)] bg-[var(--color-page)] text-[var(--color-ink)]"
          : "border-transparent bg-transparent text-black/70 hover:text-[var(--color-ink)]"
      }`}
    >
      <AnimatedMenuIcon {...animatedIcon} triggerKey={hoverTick} />
      <span>{label}</span>
    </Link>
  );
}

function IconLink({
  href,
  icon,
  label,
  active,
  tourId,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  tourId?: string;
}) {
  return (
    <Link
      prefetch
      href={href}
      aria-label={label}
      title={label}
      data-tour-id={tourId}
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

type NotificationsListPayload = {
  unread_count?: number;
  items?: NotificationItem[];
  total?: number;
};

const NOTIFICATIONS_POLL_INTERVAL_MS = 15_000;
const NOTIFICATIONS_HOVER_CLOSE_DELAY_MS = 2_000;

function NotificationsIconLink({
  href,
  locale,
  icon,
  label,
  tourId,
  active,
}: {
  href: string;
  locale: Locale;
  icon: ReactNode;
  label: string;
  tourId?: string;
  active: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasHydrated = useRef(false);
  const lastUnreadCount = useRef(0);
  const lastToastNotificationId = useRef<string | number | null>(null);
  const isPolling = useRef(false);
  const hoverCloseTimeoutRef = useRef<number | null>(null);

  const clearHoverCloseTimeout = useCallback(() => {
    if (hoverCloseTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(hoverCloseTimeoutRef.current);
    hoverCloseTimeoutRef.current = null;
  }, []);

  const pollNotifications = useCallback(async () => {
    if (isPolling.current) {
      return;
    }

    isPolling.current = true;

    try {
      const response = await fetch("/api/notifications/list?limit=40", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as NotificationsListPayload;
      const nextUnreadCount = Number(payload.unread_count ?? 0);
      const latestUnread = (payload.items ?? []).find((item) => !item.read_at) ?? null;
      const latestUnreadId = latestUnread?.id ?? null;

      if (
        hasHydrated.current &&
        nextUnreadCount > lastUnreadCount.current &&
        latestUnreadId &&
        latestUnreadId !== lastToastNotificationId.current &&
        !active
      ) {
        setToastMessage(latestUnread?.data?.title?.trim() || notificationToastLabel(locale));
      }

      setUnreadCount(nextUnreadCount);
      setAllNotifications(payload.items ?? []);
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

  const visibleNotifications = allNotifications.slice(0, 9);

  const isOpen = isPinnedOpen || isHovering;

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
      clearHoverCloseTimeout();
    };
  }, [clearHoverCloseTimeout, pollNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        clearHoverCloseTimeout();
        setIsHovering(false);
        setIsPinnedOpen(false);
        setIsActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearHoverCloseTimeout();
        setIsHovering(false);
        setIsPinnedOpen(false);
        setIsActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [clearHoverCloseTimeout, isOpen]);

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

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  async function handleReadAll() {
    const formData = new FormData();
    formData.set("locale", locale);

    await fetch("/api/notifications/read-all", {
      method: "POST",
      body: formData,
    }).catch(() => undefined);

    setUnreadCount(0);
    setAllNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setIsActionsOpen(false);
  }

  async function handleClearAll() {
    const formData = new FormData();
    formData.set("locale", locale);

    await fetch("/api/notifications/clear", {
      method: "POST",
      body: formData,
    }).catch(() => undefined);

    setUnreadCount(0);
    setAllNotifications([]);
    setIsActionsOpen(false);
  }

  async function handleRemoveNotification(notificationId: string, isUnread: boolean) {
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("redirect_to", `/${locale}/notificacoes`);

    await fetch(`/api/notifications/${notificationId}/delete`, {
      method: "POST",
      body: formData,
    }).catch(() => undefined);

    setAllNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    if (isUnread) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  async function handleNotificationClick(notification: NotificationItem) {
    const action = resolveNotificationAction(locale, notification);
    if (!action) {
      return;
    }

    if (!notification.read_at) {
      const formData = new FormData();
      formData.set("locale", locale);
      formData.set("redirect_to", action);

      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        body: formData,
      }).catch(() => undefined);

      setUnreadCount((current) => Math.max(0, current - 1));
      setAllNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
      );
    }

    setIsPinnedOpen(false);
    setIsActionsOpen(false);
    router.push(action);
  }

  return (
    <>
      <div
        ref={rootRef}
        className="relative"
        onMouseEnter={() => {
          clearHoverCloseTimeout();
          setIsHovering(true);
          void pollNotifications();
        }}
        onMouseLeave={() => {
          clearHoverCloseTimeout();
          if (isPinnedOpen) {
            return;
          }

          hoverCloseTimeoutRef.current = window.setTimeout(() => {
            setIsHovering(false);
            setIsActionsOpen(false);
            hoverCloseTimeoutRef.current = null;
          }, NOTIFICATIONS_HOVER_CLOSE_DELAY_MS);
        }}
      >
        <button
          type="button"
          data-tour-id={tourId}
          aria-label={label}
          title={label}
          aria-expanded={isOpen}
          onClick={() => {
            setIsPinnedOpen((current) => !current);
            setIsActionsOpen(false);
            void pollNotifications();
          }}
          className={`relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[8px] ring-1 transition ${
            active || isOpen
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
        </button>

        {isOpen ? (
          <div className="absolute right-0 top-12 z-50 w-[360px] rounded-[10px] border border-[var(--color-border-soft)] bg-white shadow-[0_20px_44px_-26px_rgba(76,16,140,0.5)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-3 py-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Notificações</p>
              <div className="flex items-center gap-2">
                {allNotifications.length > 0 ? (
                  <Link href={href} className="text-xs font-semibold text-[var(--color-primary)] underline">
                    Ver mais
                  </Link>
                ) : null}
                {allNotifications.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-border-soft)] bg-white text-black/70 hover:bg-black/5"
                      onClick={() => setIsActionsOpen((current) => !current)}
                      aria-label="Ações de notificações"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {isActionsOpen ? (
                      <div className="absolute right-0 top-9 z-10 w-36 rounded-[8px] border border-[var(--color-border-soft)] bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-left text-xs font-semibold text-black/75 hover:bg-black/5"
                          onClick={() => void handleReadAll()}
                        >
                          <CheckCircle2 size={12} />
                          Ler todas
                        </button>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                          onClick={() => void handleClearAll()}
                        >
                          <Trash2 size={12} />
                          Limpar
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-2 py-5 text-center">
                  <Image
                    src="/empty-states/notifications-empty.gif"
                    alt="Sem notificações"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-auto w-20 brightness-125 contrast-75 saturate-90"
                  />
                  <p className="text-xs font-semibold text-black/60">Não há nada aqui.</p>
                </div>
              ) : (
                visibleNotifications.map((notification, index) => {
                  const action = resolveNotificationAction(locale, notification);
                  const isUnread = !notification.read_at;
                  const context = resolveNotificationContext(notification);
                  const iconKey = resolveNotificationIconKey(notification);

                  return (
                    <div key={notification.id}>
                      <div className="flex items-start gap-2 px-2 py-2">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-black/5 text-black/75">
                          {renderNotificationIcon(iconKey)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleNotificationClick(notification)}
                          disabled={!action}
                          className={`min-w-0 flex-1 text-left ${
                            action ? "cursor-pointer" : "cursor-default"
                          }`}
                        >
                          <p className={`line-clamp-1 text-xs font-semibold ${isUnread ? "text-[var(--color-ink)]" : "text-black/70"}`}>
                            {notification.data?.title ?? "Notificação"}
                          </p>
                          <p className="line-clamp-2 text-xs text-black/60">{notification.data?.message ?? "Sem detalhes."}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-black/45">
                            {context} · {formatNotificationDate(notification.created_at)}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-black/55 hover:bg-black/5 hover:text-red-700"
                          aria-label="Remover notificação"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveNotification(String(notification.id), isUnread);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {index < visibleNotifications.length - 1 ? <hr className="border-black/10" /> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

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

function renderNotificationIcon(icon: string) {
  switch (icon) {
    case "user-plus":
      return <UserPlus size={13} />;
    case "check-circle-2":
      return <CheckCircle2 size={13} />;
    case "x-circle":
      return <XCircle size={13} />;
    case "users-round":
      return <UsersRound size={13} />;
    case "clapperboard":
      return <Clapperboard size={13} />;
    case "message-circle":
      return <MessageCircle size={13} />;
    case "trophy":
      return <Trophy size={13} />;
    default:
      return <Bell size={13} />;
  }
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  tourId,
  active,
}: {
  locale: Locale;
  label: string;
  tourId?: string;
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
  const [hoverTick, setHoverTick] = useState(0);
  const [submenuEpisodeHoverTick, setSubmenuEpisodeHoverTick] = useState(0);
  const [submenuOpportunityHoverTick, setSubmenuOpportunityHoverTick] = useState(0);
  const [submenuCommunityHoverTick, setSubmenuCommunityHoverTick] = useState(0);
  const [submenuCommunityHoverId, setSubmenuCommunityHoverId] = useState<number | null>(null);

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

  useEffect(() => {
    function handleTourPublish(event: Event) {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      if (customEvent.detail?.open) {
        setIsClosing(false);
        setIsOpen(true);
        return;
      }

      setShowOrganizations(false);
      setOrganizationsError(null);
      setIsOpen(false);
      setIsClosing(false);
    }

    window.addEventListener("dubflow:tour:publish", handleTourPublish as EventListener);
    return () => {
      window.removeEventListener("dubflow:tour:publish", handleTourPublish as EventListener);
    };
  }, []);

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
    <div ref={rootRef} className="relative" data-tour-id={tourId}>
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setHoverTick((current) => current + 1)}
        onFocus={() => setHoverTick((current) => current + 1)}
        aria-expanded={isOpen}
        className={`group inline-flex h-9 -mb-px cursor-pointer items-center gap-2.5 rounded-t-[10px] border-x border-t px-3.5 pb-[7px] pt-[7px] text-[17px] transition-colors duration-200 ease-out ${
          active
            ? "border-[var(--color-border-soft)] bg-[var(--color-page)] text-[var(--color-ink)]"
            : "border-transparent bg-transparent text-black/70 hover:text-[var(--color-ink)]"
        }`}
      >
        <AnimatedMenuIcon
          staticIcon={<Clapperboard size={22} className="text-[#22c55e]" />}
          gifSrc="/nav-gifs/create.gif"
          gifAlt="Criar"
          size={22}
          playDurationMs={1700}
          triggerKey={hoverTick}
        />
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>

      {shouldRenderMenu ? (
        <div
          data-tour-id="home-nav-publish-menu"
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
                    onMouseEnter={() => {
                      setSubmenuCommunityHoverId(organization.id);
                      setSubmenuCommunityHoverTick((current) => current + 1);
                    }}
                    onFocus={() => {
                      setSubmenuCommunityHoverId(organization.id);
                      setSubmenuCommunityHoverTick((current) => current + 1);
                    }}
                    className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                  >
                    <AnimatedMenuIcon
                      staticIcon={<Building2 size={14} className="text-[#0ea5e9]" />}
                      gifSrc="/nav-gifs/communities.gif"
                      gifAlt="Comunidades"
                      size={14}
                      playDurationMs={1600}
                      triggerKey={submenuCommunityHoverId === organization.id ? submenuCommunityHoverTick : 0}
                    />
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
                onMouseEnter={() => setSubmenuEpisodeHoverTick((current) => current + 1)}
                onFocus={() => setSubmenuEpisodeHoverTick((current) => current + 1)}
                className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm text-black/80 hover:bg-black/5"
              >
                <AnimatedMenuIcon
                  staticIcon={<Clapperboard size={16} className="text-[#22c55e]" />}
                  gifSrc="/nav-gifs/submenu-create-episode.gif"
                  gifAlt="Criar episódio"
                  size={16}
                  playDurationMs={1600}
                  triggerKey={submenuEpisodeHoverTick}
                />
                Episódio
              </Link>

              <button
                type="button"
                onClick={() => handleOpenOrganizations()}
                onMouseEnter={() => setSubmenuOpportunityHoverTick((current) => current + 1)}
                onFocus={() => setSubmenuOpportunityHoverTick((current) => current + 1)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-left text-sm text-black/80 hover:bg-black/5"
              >
                <AnimatedMenuIcon
                  staticIcon={<Mic2 size={16} className="text-[#ef4444]" />}
                  gifSrc="/nav-gifs/submenu-create-opportunity.gif"
                  gifAlt="Criar oportunidade"
                  size={16}
                  playDurationMs={1600}
                  triggerKey={submenuOpportunityHoverTick}
                />
                Oportunidade
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
