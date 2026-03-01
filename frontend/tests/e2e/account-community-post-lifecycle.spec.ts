import { expect, test } from "@playwright/test";

import { tinyPngFilePayload, uniqueLabel } from "./utils/e2e-helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18000/api/v1";

test("fluxo completo: conta, comunidade, playlist, perfil, senha, post e interacoes", async ({ page, request }) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = `Fluxo E2E ${suffix}`;
  const email = `fluxo.e2e.${suffix}@example.com`;
  const password = "Test@12345";
  const newPassword = "Test@123456";
  const communityName = uniqueLabel("Comunidade Fluxo");
  const username = `fluxo_${suffix.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20)}`;
  const postTitle = uniqueLabel("Post Fluxo");
  const postTitleEdited = `${postTitle} Editado`;
  const commentBody = `Comentário E2E ${suffix}`;

  await page.goto("/pt-BR/criar-conta");
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password_confirmation"]').fill(password);
  await page.locator('input[name="terms_accepted"]').check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);

  await page.context().clearCookies();
  await page.goto("/pt-BR/entrar");
  await expect(page).toHaveURL(/\/pt-BR\/entrar/);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);

  await page.goto("/pt-BR/nova-organizacao");
  await page.locator('input[name="name"]').fill(communityName);
  await page.locator('input[name="description"]').fill("Comunidade criada pelo fluxo E2E.");
  await page.getByRole("button", { name: "Criar comunidade" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/organizations\//);

  const communityMatch = page.url().match(/\/organizations\/([^/?]+)/);
  expect(communityMatch).toBeTruthy();
  const communitySlug = communityMatch?.[1] ?? "";

  await page.goto(`/pt-BR/nova-playlist?organization=${communitySlug}`);
  await page.locator('input[name="title"]').fill("Playlist Fluxo E2E");
  await page.locator('input[name="work_title"]').fill("Obra Fluxo E2E");
  await page.locator('input[name="description"]').fill("Descrição da playlist no fluxo E2E");
  await page.locator('input[name="release_year"]').fill("2026");
  await page.getByRole("button", { name: "Criar playlist" }).click();
  await expect(page).toHaveURL(new RegExp(`/pt-BR/playlists/${communitySlug}/\\d+`), { timeout: 20_000 });

  await page.goto("/pt-BR/perfil/editar");
  await page.locator('input[name="name"]').fill(`${name} Atualizado`);
  await page.locator('input[name="username"]').fill(username);
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/perfil\/editar\?updated=1/);
  await expect(page.locator('input[name="username"]')).toHaveValue(username);

  await page.getByRole("button", { name: "Perfil público" }).click();
  await page.locator('textarea[name="bio"]').fill("Bio atualizada via fluxo E2E.");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/perfil\/editar\?updated=1/);

  await page.goto("/pt-BR/alterar-senha");
  await page.locator('input[name="current_password"]').fill(password);
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="password_confirmation"]').fill(newPassword);
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/entrar\?changed=1/);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(newPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);

  await page.goto("/pt-BR/publicar");
  await page.locator('input[name="title"]').fill(postTitle);
  await page.locator('input[name="work_title"]').fill("Obra do Post E2E");
  await page.locator('input[name="description"]').fill("Descrição do post no fluxo E2E");
  await page.setInputFiles('input[name="media_assets[]"]', tinyPngFilePayload("post-fluxo.png"));
  await page.getByRole("button", { name: "Publicar episódio" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/post\/\d+/);

  const postIdMatch = page.url().match(/\/post\/(\d+)/);
  expect(postIdMatch).toBeTruthy();
  const postId = Number(postIdMatch?.[1]);

  const postCard = page.locator(`#post-${postId}`);
  await postCard.getByRole("button", { name: "Mais ações do episódio" }).click();
  await postCard.getByRole("link", { name: "Editar episódio" }).click();
  await expect(page).toHaveURL(new RegExp(`/pt-BR/post/${postId}/editar`));
  await page.locator('input[name="title"]').fill(postTitleEdited);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page).toHaveURL(new RegExp(`/pt-BR/post/${postId}\\?updated=1`));
  await expect(page.getByText(postTitleEdited)).toBeVisible();

  await page.getByRole("button", { name: "Curtir" }).click();
  await page.getByRole("button", { name: /Comentar/ }).click();
  const composer = page.getByPlaceholder("Escreva um comentário...");
  await composer.fill(commentBody);
  await composer.press("Enter");
  await expect(page.getByText(commentBody)).toBeVisible();

  const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password: newPassword },
    headers: { Accept: "application/json" },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = (await loginResponse.json()) as { access_token?: string };
  expect(loginPayload.access_token).toBeTruthy();

  await expect
    .poll(
      async () => {
        const postResponse = await request.get(`${API_BASE_URL}/posts/${postId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${loginPayload.access_token}`,
          },
        });
        if (!postResponse.ok()) {
          return null;
        }
        const postPayload = (await postResponse.json()) as {
          post?: { likes_count?: number; comments_count?: number; title?: string };
        };
        return postPayload.post?.title ?? null;
      },
      { timeout: 10_000 }
    )
    .toBe(postTitleEdited);

  await expect
    .poll(
      async () => {
        const postResponse = await request.get(`${API_BASE_URL}/posts/${postId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${loginPayload.access_token}`,
          },
        });
        if (!postResponse.ok()) {
          return 0;
        }
        const postPayload = (await postResponse.json()) as {
          post?: { likes_count?: number; comments_count?: number };
        };
        return postPayload.post?.comments_count ?? 0;
      },
      { timeout: 10_000 }
    )
    .toBeGreaterThanOrEqual(1);

  page.on("dialog", (dialog) => dialog.accept());
  await postCard.getByRole("button", { name: "Mais ações do episódio" }).click();
  await postCard.getByRole("button", { name: "Excluir episódio" }).click();
  await expect(page.locator(`#post-${postId}`)).toHaveCount(0);

  const deletedResponse = await request.get(`${API_BASE_URL}/posts/${postId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${loginPayload.access_token}`,
    },
  });
  expect(deletedResponse.status()).toBe(404);
});
