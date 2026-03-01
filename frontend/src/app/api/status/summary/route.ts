import { NextResponse } from "next/server";

type ServiceStatus = "operational" | "degraded" | "down";

type ServiceSummary = {
  id: string;
  name: string;
  status: ServiceStatus;
  latency_ms: number | null;
  detail: string;
};

function normalizeApiRoot() {
  const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  return apiBase.replace(/\/api\/v1\/?$/, "");
}

async function checkService({
  id,
  name,
  url,
  detailOk,
  detailAuthRequired,
  signalTimeout = 4500,
  isHealthy,
}: {
  id: string;
  name: string;
  url: string;
  detailOk: string;
  detailAuthRequired?: string;
  signalTimeout?: number;
  isHealthy?: (response: Response) => boolean;
}): Promise<ServiceSummary> {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(signalTimeout),
    });

    const latency = Date.now() - startedAt;
    const healthy = isHealthy ? isHealthy(response) : response.ok;
    if (healthy) {
      const authRequired = response.status === 401;
      return {
        id,
        name,
        status: latency > 1400 ? "degraded" : "operational",
        latency_ms: latency,
        detail: authRequired
          ? (detailAuthRequired ?? "Serviço disponível, porém exige autenticação.")
          : latency > 1400
            ? `${detailOk} com latência acima do esperado.`
            : detailOk,
      };
    }

    return {
      id,
      name,
      status: "down",
      latency_ms: latency,
      detail: `Falha HTTP ${response.status}.`,
    };
  } catch {
    return {
      id,
      name,
      status: "down",
      latency_ms: null,
      detail: "Timeout ou indisponibilidade no check deste sistema.",
    };
  }
}

export async function GET(request: Request) {
  const checkedAt = new Date().toISOString();
  const apiRoot = normalizeApiRoot();
  const origin = new URL(request.url).origin;

  const services = await Promise.all([
    checkService({
      id: "frontend_web",
      name: "Frontend web",
      url: `${origin}/pt-BR`,
      detailOk: "Aplicação web respondendo normalmente.",
    }),
    checkService({
      id: "backend_api",
      name: "Backend API",
      url: `${apiRoot}/up`,
      detailOk: "Backend respondendo normalmente.",
    }),
    checkService({
      id: "timeline_algorithm",
      name: "Algoritmo da timeline",
      url: `${origin}/api/posts/feed?per_page=1`,
      detailOk: "Feed e ordenação da timeline respondendo.",
    }),
    checkService({
      id: "video_player",
      name: "Player de vídeo",
      url: `${origin}/api/playlists/list?per_page=1`,
      detailOk: "Serviço de playlists/player disponível.",
    }),
    checkService({
      id: "episode_publishing",
      name: "Sistema de publicar episódio",
      url: `${origin}/pt-BR/publicar`,
      detailOk: "Fluxo de publicação acessível.",
    }),
    checkService({
      id: "opportunities_module",
      name: "Sistema de oportunidades",
      url: `${origin}/api/dubbing-tests/opportunities?per_page=1`,
      detailOk: "Módulo de oportunidades disponível.",
      detailAuthRequired: "Módulo de oportunidades disponível (login necessário para listagem).",
      isHealthy: (response) => response.ok || response.status === 401,
    }),
  ]);

  const overallStatus: ServiceStatus = services.some((service) => service.status === "down")
    ? "down"
    : services.some((service) => service.status === "degraded")
      ? "degraded"
      : "operational";

  return NextResponse.json(
    {
      checked_at: checkedAt,
      overall_status: overallStatus,
      services,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
