"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";

const HOME_TOUR_STORAGE_KEY = "dubflow_tour_home_seen_v2";
const HOME_TOUR_LEGACY_STORAGE_KEY = "dubflow_tour_home_v1";

type TourAudience = "all" | "guest" | "auth";

type TourStep = {
  id: string;
  audience: TourAudience;
  title: string;
  description: string;
  selectors: string[];
  publishMenuOpen?: boolean;
};

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
  viewportWidth: number;
  viewportHeight: number;
};

const HOME_TOUR_STEPS: TourStep[] = [
  {
    id: "home-tour-feed-all",
    audience: "all",
    title: "Feed principal",
    description: "Aqui você acompanha os episódios e novidades mais recentes da plataforma.",
    selectors: ['[data-tour-id="home-nav-feed"]'],
  },
  {
    id: "home-tour-search-all",
    audience: "all",
    title: "Busca rápida",
    description: "Aqui você encontra usuários, comunidades e conteúdos em segundos.",
    selectors: ['[data-tour-id="home-search"]'],
  },
  {
    id: "home-tour-communities",
    audience: "guest",
    title: "Comunidades",
    description: "Você pode explorar comunidades, mas para participar e interagir precisa entrar na sua conta.",
    selectors: ['[data-tour-id="home-nav-communities"]'],
  },
  {
    id: "home-tour-opportunities",
    audience: "guest",
    title: "Oportunidades",
    description: "Você pode ver os testes, mas para se inscrever e acompanhar candidaturas precisa estar logado.",
    selectors: ['[data-tour-id="home-nav-opportunities"]'],
  },
  {
    id: "home-tour-auth-actions-guest",
    audience: "guest",
    title: "Entrar ou criar conta",
    description: "Entre para liberar interações no feed, comunidades e oportunidades, ou crie sua conta agora.",
    selectors: ['[data-tour-id="home-auth-actions"]'],
  },
  {
    id: "home-tour-communities",
    audience: "auth",
    title: "Comunidades",
    description: "Explore comunidades para seguir projetos, publicar e acompanhar lançamentos.",
    selectors: ['[data-tour-id="home-nav-communities"]'],
  },
  {
    id: "home-tour-opportunities",
    audience: "auth",
    title: "Oportunidades",
    description: "Confira testes abertos, filtre por comunidade e acompanhe suas inscrições.",
    selectors: ['[data-tour-id="home-nav-opportunities"]'],
  },
  {
    id: "home-tour-publish-auth",
    audience: "auth",
    title: "Publicar",
    description: "Com esse menu aberto você publica episódio, cria teste de dublagem por comunidade, playlist e comunidade.",
    selectors: ['[data-tour-id="home-nav-publish-menu"]', '[data-tour-id="home-nav-publish"]'],
    publishMenuOpen: true,
  },
  {
    id: "home-tour-notifications-auth",
    audience: "auth",
    title: "Notificações",
    description: "Acompanhe alertas de chat, comunidade e oportunidade em tempo real por aqui.",
    selectors: ['[data-tour-id="home-nav-notifications"]'],
  },
  {
    id: "home-tour-chat-auth",
    audience: "auth",
    title: "Chats",
    description: "Acesse suas conversas direto por este atalho e continue de onde parou.",
    selectors: ['[data-tour-id="home-nav-messages"]'],
  },
  {
    id: "home-tour-rail-30days-auth",
    audience: "auth",
    title: "Últimos 30 dias",
    description: "Na home, a lateral direita mostra este ranking com os destaques recentes e acesso rápido aos perfis.",
    selectors: ['[data-tour-id="home-rail-30days"]'],
  },
  {
    id: "home-tour-rail-top-week-auth",
    audience: "auth",
    title: "Top post da semana",
    description: "Esse card destaca o melhor post com base em engajamento: curtidas, comentários, views e recência.",
    selectors: ['[data-tour-id="home-rail-top-week"]'],
  },
  {
    id: "home-tour-dashboard-auth",
    audience: "auth",
    title: "Painel",
    description: "Aqui você entra no painel para acompanhar dados da conta, atividade e gestão dos seus recursos.",
    selectors: ['[data-tour-id="home-nav-dashboard"]'],
  },
];

const ALL_TOUR_STEP_IDS = Array.from(new Set(HOME_TOUR_STEPS.map((step) => step.id)));
const SEEN_ID_MIGRATION: Record<string, string> = {
  "home-tour-communities-guest": "home-tour-communities",
  "home-tour-communities-auth": "home-tour-communities",
  "home-tour-opportunities-guest": "home-tour-opportunities",
  "home-tour-opportunities-auth": "home-tour-opportunities",
};

function parsePixelRadius(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const match = value.match(/([\d.]+)/);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setPublishTourMenuOpen(open: boolean) {
  window.dispatchEvent(new CustomEvent("dubflow:tour:publish", { detail: { open } }));
}

function persistSeenStepIds(ids: Set<string>) {
  try {
    localStorage.setItem(HOME_TOUR_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore localStorage write errors.
  }
}

function normalizeSeenStepIds(rawIds: string[]): Set<string> {
  const normalized = new Set<string>();

  for (const rawId of rawIds) {
    const id = rawId.trim();
    if (!id) {
      continue;
    }

    normalized.add(SEEN_ID_MIGRATION[id] ?? id);
  }

  return normalized;
}

function readSeenStepIds(): Set<string> {
  try {
    const current = localStorage.getItem(HOME_TOUR_STORAGE_KEY);
    if (current?.trim()) {
      if (current === "done") {
        return new Set(ALL_TOUR_STEP_IDS);
      }

      const parsed = JSON.parse(current) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeSeenStepIds(
          parsed.filter((item): item is string => typeof item === "string")
        );
      }
    }

    const legacy = localStorage.getItem(HOME_TOUR_LEGACY_STORAGE_KEY);
    if (legacy === "done") {
      return new Set(ALL_TOUR_STEP_IDS);
    }
  } catch {
    // Ignore localStorage parse/read errors.
  }

  return new Set<string>();
}

function resolveEligibleSteps(isAuthenticated: boolean, seenStepIds: Set<string>): TourStep[] {
  return HOME_TOUR_STEPS.filter((step) => {
    const audienceMatches =
      step.audience === "all" ||
      (isAuthenticated && step.audience === "auth") ||
      (!isAuthenticated && step.audience === "guest");

    return audienceMatches && !seenStepIds.has(step.id);
  });
}

export function HomeTour({ locale, isAuthenticated }: { locale: Locale; isAuthenticated: boolean }) {
  const pathname = usePathname() ?? "";
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const highlightedTargetsRef = useRef<HTMLElement[]>([]);
  const highlightedContainersRef = useRef<HTMLElement[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [seenStepIds, setSeenStepIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    return [...readSeenStepIds()];
  });
  const [tourQueue, setTourQueue] = useState<TourStep[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionIndex, setSessionIndex] = useState(0);

  const activeStep = tourQueue[0] ?? null;
  const isHomePath = pathname === `/${locale}` || pathname === `/${locale}/`;
  const allTourSelectors = useMemo(
    () => Array.from(new Set(tourQueue.flatMap((step) => step.selectors))),
    [tourQueue]
  );
  const eligibleSteps = useMemo(
    () => resolveEligibleSteps(isAuthenticated, new Set(seenStepIds)),
    [isAuthenticated, seenStepIds]
  );

  const clearActiveTargetZoom = useCallback(() => {
    if (!activeTargetRef.current) {
      return;
    }

    activeTargetRef.current.classList.remove("tour-focus-zoom");
    activeTargetRef.current = null;
  }, []);

  const clearHighlightedTargets = useCallback(() => {
    if (highlightedTargetsRef.current.length > 0) {
      highlightedTargetsRef.current.forEach((target) => {
        target.classList.remove("tour-focus-visible");
      });
      highlightedTargetsRef.current = [];
    }

    if (highlightedContainersRef.current.length > 0) {
      highlightedContainersRef.current.forEach((container) => {
        container.classList.remove("tour-focus-container");
      });
      highlightedContainersRef.current = [];
    }
  }, []);

  const syncHighlightedTargets = useCallback(() => {
    clearHighlightedTargets();

    const uniqueTargets = new Set<HTMLElement>();
    const uniqueContainers = new Set<HTMLElement>();
    for (const selector of allTourSelectors) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        uniqueTargets.add(element);
        const topNavContainer = element.closest<HTMLElement>('[data-top-nav="1"]');
        if (topNavContainer) {
          uniqueContainers.add(topNavContainer);
        }
      });
    }

    uniqueTargets.forEach((target) => {
      target.classList.add("tour-focus-visible");
    });
    uniqueContainers.forEach((container) => {
      container.classList.add("tour-focus-container");
    });
    highlightedTargetsRef.current = [...uniqueTargets];
    highlightedContainersRef.current = [...uniqueContainers];
  }, [allTourSelectors, clearHighlightedTargets]);

  const setActiveTargetZoom = useCallback(
    (target: HTMLElement) => {
      if (activeTargetRef.current === target) {
        return;
      }

      clearActiveTargetZoom();
      target.classList.add("tour-focus-zoom");
      activeTargetRef.current = target;
    },
    [clearActiveTargetZoom]
  );

  const markStepAsSeen = useCallback((stepId: string) => {
    setSeenStepIds((previous) => {
      if (previous.includes(stepId)) {
        return previous;
      }

      const next = [...previous, stepId];
      persistSeenStepIds(new Set(next));
      return next;
    });
  }, []);

  const markAllAsSeen = useCallback(() => {
    const all = new Set(ALL_TOUR_STEP_IDS);
    persistSeenStepIds(all);
    setSeenStepIds([...all]);
  }, []);

  const closeTour = useCallback((markAll: boolean) => {
    if (markAll) {
      markAllAsSeen();
    }

    setPublishTourMenuOpen(false);
    clearActiveTargetZoom();
    clearHighlightedTargets();
    setIsOpen(false);
    setTargetRect(null);
    setTourQueue([]);
    setSessionTotal(0);
    setSessionIndex(0);
  }, [clearActiveTargetZoom, clearHighlightedTargets, markAllAsSeen]);

  const resolveVisibleTarget = useCallback((selectors: string[]): HTMLElement | null => {
    for (const selector of selectors) {
      const candidate = document.querySelector<HTMLElement>(selector);
      if (!candidate) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return candidate;
      }
    }

    return null;
  }, []);

  const refreshTargetRect = useCallback(() => {
    if (!isOpen || !activeStep) {
      return;
    }

    syncHighlightedTargets();

    const target = resolveVisibleTarget(activeStep.selectors);
    if (!target) {
      clearActiveTargetZoom();
      setSessionIndex((current) => Math.min(current + 1, Math.max(sessionTotal - 1, 0)));
      setTourQueue((current) => current.slice(1));
      return;
    }

    if (activeStep.id === "home-tour-search-all") {
      clearActiveTargetZoom();
    } else {
      setActiveTargetZoom(target);
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const rect = target.getBoundingClientRect();
    const targetStyle = window.getComputedStyle(target);
    const borderRadius = parsePixelRadius(targetStyle.borderTopLeftRadius, 10);
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  }, [activeStep, clearActiveTargetZoom, isOpen, resolveVisibleTarget, sessionTotal, setActiveTargetZoom, syncHighlightedTargets]);

  useEffect(() => {
    if (!isHomePath) {
      if (isOpen) {
        const closeId = window.setTimeout(() => {
          closeTour(false);
        }, 0);
        return () => {
          window.clearTimeout(closeId);
        };
      }
      return;
    }

    return undefined;
  }, [closeTour, isHomePath, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeStep) {
      setPublishTourMenuOpen(false);
      return;
    }

    setPublishTourMenuOpen(Boolean(activeStep.publishMenuOpen));
  }, [activeStep, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (tourQueue.length > 0) {
      return;
    }

    const closeId = window.setTimeout(() => {
      closeTour(false);
    }, 0);

    return () => {
      window.clearTimeout(closeId);
    };
  }, [closeTour, isOpen, tourQueue.length]);

  useEffect(() => {
    if (!isHomePath) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.innerWidth < 1024) {
      return;
    }

    if (isOpen || tourQueue.length > 0 || eligibleSteps.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTourQueue(eligibleSteps);
      setSessionTotal(eligibleSteps.length);
      setSessionIndex(0);
      setIsOpen(true);
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [eligibleSteps, isHomePath, isOpen, tourQueue.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      refreshTargetRect();
    });

    const onResize = () => {
      refreshTargetRect();
    };
    const onScroll = () => {
      refreshTargetRect();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTour(true);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [closeTour, isOpen, refreshTargetRect]);

  useEffect(() => {
    return () => {
      setPublishTourMenuOpen(false);
      clearActiveTargetZoom();
      clearHighlightedTargets();
    };
  }, [clearActiveTargetZoom, clearHighlightedTargets]);

  const bubblePosition = useMemo(() => {
    if (!targetRect) {
      return { top: 24, left: 24 };
    }

    const bubbleWidth = Math.min(360, targetRect.viewportWidth - 32);
    const bubbleHeight = 172;
    const margin = 16;

    const alignedLeft = Math.max(
      margin,
      Math.min(targetRect.left + targetRect.width / 2 - bubbleWidth / 2, targetRect.viewportWidth - bubbleWidth - margin)
    );

    const targetBottom = targetRect.top + targetRect.height;
    const shouldRenderBelow = targetBottom + margin + bubbleHeight <= targetRect.viewportHeight - margin;
    const alignedTop = shouldRenderBelow
      ? targetBottom + margin
      : Math.max(margin, targetRect.top - bubbleHeight - margin);

    return { top: alignedTop, left: alignedLeft };
  }, [targetRect]);

  const spotlightRect = useMemo(() => {
    if (!targetRect || !activeStep) {
      return null;
    }

    const padding = activeStep.id === "home-tour-search-all" ? 0 : 8;
    const top = Math.max(0, targetRect.top - padding);
    const left = Math.max(0, targetRect.left - padding);
    const right = Math.min(targetRect.viewportWidth, targetRect.left + targetRect.width + padding);
    const bottom = Math.min(targetRect.viewportHeight, targetRect.top + targetRect.height + padding);

    return {
      top,
      left,
      right,
      bottom,
      borderRadius: Math.max(0, targetRect.borderRadius + padding),
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [activeStep, targetRect]);

  const progressLabel = useMemo(() => {
    if (sessionTotal <= 0) {
      return "0/0";
    }

    return `${Math.min(sessionIndex + 1, sessionTotal)}/${sessionTotal}`;
  }, [sessionIndex, sessionTotal]);

  if (!isOpen || !activeStep || !targetRect || !spotlightRect) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300]">
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div
          className="absolute transition-all duration-200 ease-out"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: `${spotlightRect.borderRadius}px`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          }}
        />
      </div>

      <div className="absolute inset-0 z-[2]" />

      <div
        aria-hidden
        className="pointer-events-none absolute z-[3] border border-[var(--color-primary)]/80 shadow-[0_0_0_6px_rgba(251,146,60,0.16),0_16px_34px_-20px_rgba(249,115,22,0.9)] transition-all duration-200 ease-out animate-[tour-focus-area_280ms_ease-out]"
        style={{
          top: spotlightRect.top - 2,
          left: spotlightRect.left - 2,
          width: spotlightRect.width + 4,
          height: spotlightRect.height + 4,
          borderRadius: `${spotlightRect.borderRadius + 2}px`,
        }}
      />

      <div
        className="absolute z-[4] w-[min(360px,calc(100vw-32px))] rounded-[10px] border border-[var(--color-border-soft)] bg-white p-4 shadow-[0_24px_50px_-26px_rgba(15,23,42,0.45)] animate-[page-enter_220ms_ease-out]"
        style={{ top: bubblePosition.top, left: bubblePosition.left }}
        role="dialog"
        aria-modal="true"
        aria-label="Tour da home"
      >
        <p className="text-sm font-semibold text-[var(--color-ink)]">{activeStep.title}</p>
        <p className="mt-1 text-sm text-black/70">{activeStep.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-black/55">{progressLabel}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center rounded-[8px] border border-[var(--color-border-soft)] bg-white px-3 text-xs font-semibold text-black/70 hover:bg-black/5"
              onClick={() => closeTour(true)}
            >
              Pular tour
            </button>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center rounded-[8px] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-strong)_100%)] px-3 text-xs font-semibold text-white hover:brightness-110"
              onClick={() => {
                markStepAsSeen(activeStep.id);
                setSessionIndex((current) => Math.min(current + 1, Math.max(sessionTotal - 1, 0)));
                setTourQueue((current) => current.slice(1));
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
