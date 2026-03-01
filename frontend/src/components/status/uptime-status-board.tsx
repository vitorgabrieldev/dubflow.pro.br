"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, ServerCrash } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";

type ServiceStatus = "operational" | "degraded" | "down";

type StatusPayload = {
  checked_at: string;
  overall_status: ServiceStatus;
  services: Array<{
    id: string;
    name: string;
    status: ServiceStatus;
    latency_ms: number | null;
    detail: string;
  }>;
};

const POLL_INTERVAL_MS = 20_000;
const HISTORY_SIZE = 24;
const HISTORY_STORAGE_KEY = "dubflow:status:hourly:v1";

type HourlyBarStatus = "ok" | "down" | "unknown";
type HourlyHistoryEntry = { hour_key: string; status: HourlyBarStatus };
type HourlyHistoryStore = Record<string, HourlyHistoryEntry[]>;

export function UptimeStatusBoard() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [historyStore, setHistoryStore] = useState<HourlyHistoryStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/status/summary", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as StatusPayload;

      if (!response.ok || !payload.overall_status) {
        throw new Error("Falha ao carregar status.");
      }

      setData(payload);
      setHistoryStore((current) => {
        const next = mergeHourlyHistory(current, payload.services);
        persistHistory(next);
        return next;
      });
      setError(null);
    } catch {
      setError("Não foi possível atualizar o status agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setHistoryStore(loadHistory());
    void fetchStatus();
    const intervalId = window.setInterval(() => {
      void fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const overallLabel = useMemo(() => {
    if (!data) {
      return "Verificando";
    }
    if (data.overall_status === "operational") {
      return "Todos os sistemas operacionais";
    }
    if (data.overall_status === "degraded") {
      return "Instabilidade parcial detectada";
    }
    return "Indisponibilidade detectada";
  }, [data]);

  return (
    <section className="space-y-4">
      <div className={`rounded-[10px] px-4 py-3 text-sm font-semibold ${overallBannerClass(data?.overall_status)}`}>{overallLabel}</div>

      <Card>
        <CardBody className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-ink)]">
                <Activity size={18} />
                Status do DubFlow
              </p>
              <p className="text-sm text-black/65">Monitoramento público de disponibilidade do frontend e backend.</p>
            </div>

            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${overallBadgeClass(data?.overall_status)}`}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : statusIcon(data?.overall_status)}
              {overallLabel}
            </span>
          </div>

          <p className="text-xs text-black/50">
            Última atualização: {data?.checked_at ? formatDateTime(data.checked_at) : "aguardando primeira leitura"} • atualização automática a cada 20s
          </p>
        </CardBody>
      </Card>

      {error ? (
        <Card>
          <CardBody className="p-4 text-sm text-red-700">{error}</CardBody>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.services ?? []).map((service) => (
          <Card key={service.name}>
            <CardBody className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{service.name}</p>
                <span className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-xs font-semibold ${serviceBadgeClass(service.status)}`}>
                  {statusIcon(service.status)}
                  {serviceLabel(service.status)}
                </span>
              </div>

              <p className="text-sm text-black/70">{service.detail}</p>
              <p className="text-xs text-black/55">
                Latência: {typeof service.latency_ms === "number" ? `${service.latency_ms} ms` : "n/d"}
              </p>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-black/50">Últimas 24 horas</p>
                <div className="flex items-center gap-1">
                  {buildBars(historyStore[service.id]).map((bar) => (
                    <span
                      key={`${service.id}-${bar.hour_key}`}
                      title={barTooltipLabel(bar)}
                      className={`h-7 w-[6px] rounded-full ${barClass(bar.status)}`}
                    />
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}

function loadHistory(): HourlyHistoryStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as HourlyHistoryStore;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function persistHistory(history: HourlyHistoryStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage failures.
  }
}

function mergeHourlyHistory(current: HourlyHistoryStore, services: StatusPayload["services"]): HourlyHistoryStore {
  const hourKey = getHourKey(new Date());
  const next: HourlyHistoryStore = { ...current };

  for (const service of services) {
    const status: HourlyBarStatus = service.status === "operational" ? "ok" : "down";
    const existing = [...(next[service.id] ?? [])];
    const currentHourIndex = existing.findIndex((entry) => entry.hour_key === hourKey);

    if (currentHourIndex >= 0) {
      existing[currentHourIndex] = { hour_key: hourKey, status };
    } else {
      existing.push({ hour_key: hourKey, status });
    }

    next[service.id] = existing.slice(-HISTORY_SIZE);
  }

  return next;
}

function getHourKey(date: Date) {
  const local = new Date(date);
  local.setMinutes(0, 0, 0);
  return local.toISOString();
}

function buildBars(entries: HourlyHistoryEntry[] | undefined): HourlyHistoryEntry[] {
  const map = new Map<string, HourlyBarStatus>();
  for (const entry of entries ?? []) {
    map.set(entry.hour_key, entry.status);
  }

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const bars: HourlyHistoryEntry[] = [];

  for (let i = HISTORY_SIZE - 1; i >= 0; i -= 1) {
    const cursor = new Date(now);
    cursor.setHours(now.getHours() - i);
    const key = cursor.toISOString();
    bars.push({
      hour_key: key,
      status: map.get(key) ?? "unknown",
    });
  }

  return bars;
}

function barClass(status: HourlyBarStatus) {
  if (status === "ok") {
    return "bg-emerald-500";
  }
  if (status === "down") {
    return "bg-red-500";
  }
  return "bg-black/15";
}

function barTooltipLabel(bar: HourlyHistoryEntry) {
  const label = formatHour(bar.hour_key);
  if (bar.status === "ok") {
    return `${label} - operacional`;
  }
  if (bar.status === "down") {
    return `${label} - falha`;
  }
  return `${label} - sem informação`;
}

function formatHour(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function overallBadgeClass(status: ServiceStatus | undefined) {
  switch (status) {
    case "operational":
      return "bg-emerald-100 text-emerald-700";
    case "degraded":
      return "bg-amber-100 text-amber-800";
    case "down":
      return "bg-red-100 text-red-700";
    default:
      return "bg-black/5 text-black/70";
  }
}

function overallBannerClass(status: ServiceStatus | undefined) {
  switch (status) {
    case "operational":
      return "border border-emerald-200 bg-emerald-500/90 text-white";
    case "degraded":
      return "border border-amber-200 bg-amber-500/90 text-white";
    case "down":
      return "border border-red-200 bg-red-500/90 text-white";
    default:
      return "border border-black/10 bg-black/10 text-[var(--color-ink)]";
  }
}

function serviceBadgeClass(status: ServiceStatus) {
  switch (status) {
    case "operational":
      return "bg-emerald-100 text-emerald-700";
    case "degraded":
      return "bg-amber-100 text-amber-800";
    case "down":
      return "bg-red-100 text-red-700";
  }
}

function statusIcon(status: ServiceStatus | undefined) {
  if (status === "operational") {
    return <CheckCircle2 size={12} />;
  }
  if (status === "degraded") {
    return <AlertTriangle size={12} />;
  }
  if (status === "down") {
    return <ServerCrash size={12} />;
  }
  return <Loader2 size={12} className="animate-spin" />;
}

function serviceLabel(status: ServiceStatus) {
  if (status === "operational") {
    return "Operacional";
  }
  if (status === "degraded") {
    return "Instável";
  }
  return "Indisponível";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}
