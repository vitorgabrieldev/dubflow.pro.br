import { expect, test } from "@playwright/test";

test("status: endpoint summary e página pública de uptime", async ({ page, request }) => {
  const summaryResponse = await request.get("/api/status/summary");
  expect(summaryResponse.ok()).toBeTruthy();

  const summaryPayload = (await summaryResponse.json()) as {
    overall_status?: string;
    services?: Array<{ id: string; name: string; status: string; latency_ms: number | null }>;
  };

  expect(summaryPayload.overall_status).toBeTruthy();
  expect(Array.isArray(summaryPayload.services)).toBeTruthy();
  expect(summaryPayload.services?.length ?? 0).toBeGreaterThanOrEqual(6);

  const serviceIds = new Set((summaryPayload.services ?? []).map((item) => item.id));
  expect(serviceIds.has("frontend_web")).toBeTruthy();
  expect(serviceIds.has("backend_api")).toBeTruthy();
  expect(serviceIds.has("timeline_algorithm")).toBeTruthy();
  expect(serviceIds.has("video_player")).toBeTruthy();
  expect(serviceIds.has("episode_publishing")).toBeTruthy();
  expect(serviceIds.has("opportunities_module")).toBeTruthy();

  await page.goto("/pt-BR/status");
  await expect(page.getByText("Status do DubFlow")).toBeVisible();
  await expect(page.getByText("Monitoramento público de disponibilidade do frontend e backend.")).toBeVisible();

  await expect(page.getByText("Frontend web")).toBeVisible();
  await expect(page.getByText("Backend API")).toBeVisible();
  await expect(page.getByText("Algoritmo da timeline")).toBeVisible();
  await expect(page.getByText("Player de vídeo")).toBeVisible();
  await expect(page.getByText("Sistema de publicar episódio")).toBeVisible();
  await expect(page.getByText("Sistema de oportunidades")).toBeVisible();

  await expect(page.getByText("Últimas 24 horas")).toHaveCount(6);
  await expect(page.getByText(/Latência:/)).toHaveCount(6);
});
