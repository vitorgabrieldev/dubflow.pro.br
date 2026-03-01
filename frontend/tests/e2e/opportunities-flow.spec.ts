import { expect, test } from "@playwright/test";

import {
  createAuthenticatedContext,
  createDubbingTest,
  createOrganization,
  registerUser,
  tinyPngFilePayload,
  uniqueLabel,
  updateDubbingTest,
} from "./utils/e2e-helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18000/api/v1";

test("fluxo completo de oportunidades: criar, editar, inscrever, revisar, concluir e remover", async ({ browser, request }) => {
  test.setTimeout(180_000);

  const owner = await registerUser(request, { namePrefix: "Owner Opp", emailPrefix: "owner.opp" });
  const candidate = await registerUser(request, { namePrefix: "Candidate Opp", emailPrefix: "candidate.opp" });
  const organization = await createOrganization(request, owner.token);

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();

  const title = uniqueLabel("Teste Oportunidade E2E");
  const updatedTitle = `${title} Editado`;

  const startsAt = roundToQuarterHour(new Date(Date.now() - 2 * 60 * 60 * 1000));
  const resultsReleaseAt = roundToQuarterHour(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));

  await ownerPage.goto(`/pt-BR/organizations/${organization.slug}/oportunidades/novo`);
  await ownerPage.locator('label:has-text("Título do teste") input').fill(title);
  await ownerPage.locator('label:has-text("Descrição") textarea').first().fill("Descrição da oportunidade via E2E.");

  const dateInputs = ownerPage.locator('input[placeholder="Selecione data e horário"]');
  await dateInputs.nth(0).fill(formatDateTimeInput(startsAt));
  await dateInputs.nth(0).press("Tab");
  await dateInputs.nth(1).fill(formatDateTimeInput(resultsReleaseAt));
  await dateInputs.nth(1).press("Tab");

  await ownerPage.locator('input[placeholder="Nome do personagem"]').first().fill("Personagem E2E");
  await ownerPage.locator('textarea[placeholder="Perfil emocional, faixa etária, contexto."]').first().fill("Personagem principal");
  await ownerPage.locator('textarea[placeholder="Tom, intenção e referência de interpretação."]').first().fill("Tom natural e intenso");
  await ownerPage.setInputFiles('input[type="file"][accept="audio/*,video/*,image/*"]', tinyPngFilePayload("brief.png"));

  await ownerPage.getByRole("button", { name: "Criar teste" }).click();
  await expect(ownerPage).toHaveURL(/\/pt-BR\/oportunidades\/\d+/);
  await expect(ownerPage.getByRole("heading", { name: title })).toBeVisible();

  const createdUrl = ownerPage.url();
  const createdMatch = createdUrl.match(/\/oportunidades\/(\d+)/);
  expect(createdMatch).toBeTruthy();
  const testId = Number(createdMatch?.[1]);

  await ownerPage.getByRole("link", { name: "Editar teste" }).click();
  await expect(ownerPage).toHaveURL(new RegExp(`/pt-BR/organizations/${organization.slug}/oportunidades/${testId}/editar`));

  await ownerPage.locator('label:has-text("Título do teste") input').fill(updatedTitle);
  await ownerPage.getByRole("button", { name: "Salvar ajustes" }).click();
  await expect(ownerPage).toHaveURL(new RegExp(`/pt-BR/oportunidades/${testId}`));
  await expect(ownerPage.getByRole("heading", { name: updatedTitle })).toBeVisible();

  await updateDubbingTest(request, owner.token, organization.slug, testId, {
    status: "published",
  });

  await ownerPage.reload();
  await expect(ownerPage.getByText("Publicado")).toBeVisible();

  const candidateContext = await createAuthenticatedContext(browser, candidate.token);
  const candidatePage = await candidateContext.newPage();

  await candidatePage.goto(`/pt-BR/oportunidades/${testId}`);
  await expect(candidatePage).toHaveURL(new RegExp(`/pt-BR/oportunidades/${testId}`));

  await candidatePage.locator('textarea[placeholder="Fale sobre sua experiência, timbre e proposta para o personagem."]').fill("Candidato E2E com experiência em dublagem dramática.");
  await candidatePage.setInputFiles('input[type="file"][accept="audio/*,video/*,image/*"]', tinyPngFilePayload("submission.png"));
  await candidatePage.getByRole("button", { name: "Enviar inscrição" }).click();

  await expect(candidatePage).toHaveURL(new RegExp(`/pt-BR/oportunidades/${testId}`));
  await expect(candidatePage.getByText("Minhas inscrições neste teste")).toBeVisible();
  await expect(candidatePage.getByText("Enviado")).toBeVisible();

  await ownerPage.goto(`/pt-BR/organizations/${organization.slug}/oportunidades/${testId}/inscricoes`);

  const submissionCard = ownerPage.locator("article").filter({ hasText: candidate.name }).first();
  await expect(submissionCard).toBeVisible();
  await submissionCard.getByRole("button", { name: "Reprovar" }).click();
  await submissionCard.locator("textarea").fill("Feedback E2E: melhorar articulação e ritmo.");
  await submissionCard.getByRole("button", { name: "Salvar feedback" }).click();

  await expect(ownerPage.getByText("Feedback salvo com sucesso.")).toBeVisible();

  await ownerPage.getByRole("button", { name: "Concluir seleção" }).click();
  await expect(ownerPage.getByText("Seleção concluída com sucesso", { exact: false })).toBeVisible();

  await expect
    .poll(
      async () => {
        const submissionsResponse = await request.get(`${API_BASE_URL}/dubbing-tests/${testId}/my-submissions`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${candidate.token}`,
          },
        });

        if (!submissionsResponse.ok()) {
          return null;
        }

        const submissionsPayload = (await submissionsResponse.json()) as {
          submissions?: Array<{ effective_status?: string }>;
        };

        return submissionsPayload.submissions?.[0]?.effective_status ?? null;
      },
      { timeout: 10_000 }
    )
    .toBe("rejected");

  await ownerPage.goto(`/pt-BR/organizations/${organization.slug}`);
  const rowInOrganization = ownerPage.locator("article").filter({ hasText: updatedTitle }).first();
  await expect(rowInOrganization).toBeVisible();
  await rowInOrganization.getByRole("button", { name: "Remover" }).click();

  await expect(ownerPage.getByText("removido", { exact: false })).toBeVisible();
  await expect(ownerPage.locator("article").filter({ hasText: updatedTitle })).toHaveCount(0);

  await candidateContext.close();
  await ownerContext.close();
});

test("api de oportunidades no E2E: organization list e detail retornam o teste publicado", async ({ request }) => {
  const owner = await registerUser(request, { namePrefix: "Owner Opp API", emailPrefix: "owner.opp.api" });
  const organization = await createOrganization(request, owner.token);

  const created = await createDubbingTest(request, owner.token, organization.slug, {
    title: uniqueLabel("Teste API Oportunidade E2E"),
    visibility: "external",
    characters: [{ name: "Personagem API", appearance_estimate: "protagonista" }],
  });

  await updateDubbingTest(request, owner.token, organization.slug, created.id, {
    status: "published",
  });

  const orgTestsResponse = await request.get(
    `${API_BASE_URL}/organizations/${organization.slug}/dubbing-tests?per_page=20`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${owner.token}`,
      },
    }
  );

  expect(orgTestsResponse.ok()).toBeTruthy();

  const orgTestsPayload = (await orgTestsResponse.json()) as {
    data?: Array<{ id: number }>;
  };

  expect(orgTestsPayload.data?.some((item) => item.id === created.id)).toBeTruthy();

  const detailsResponse = await request.get(`${API_BASE_URL}/dubbing-tests/${created.id}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${owner.token}`,
    },
  });

  expect(detailsResponse.ok()).toBeTruthy();
  const detailsPayload = (await detailsResponse.json()) as { dubbing_test?: { id: number } };
  expect(detailsPayload.dubbing_test?.id).toBe(created.id);
});

function roundToQuarterHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  next.setMinutes(minutes - (minutes % 15));
  return next;
}

function formatDateTimeInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
