import { expect, test } from "@playwright/test";

import {
  acceptInvite,
  createAuthenticatedContext,
  createOrganization,
  inviteMember,
  registerUser,
  tinyPngFilePayload,
  uniqueLabel,
} from "./utils/e2e-helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

test("dublador publica e edita proprio episodio; dono consegue excluir", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const owner = await registerUser(request, { namePrefix: "Owner", emailPrefix: "owner.publish" });
  const editor = await registerUser(request, { namePrefix: "Editor", emailPrefix: "editor.publish" });
  const organization = await createOrganization(request, owner.token);

  await inviteMember(request, owner.token, organization.slug, editor.id, "editor");
  await acceptInvite(request, editor.token, organization.slug);

  const editorContext = await createAuthenticatedContext(browser, editor.token);
  const editorPage = await editorContext.newPage();

  const postTitle = uniqueLabel("EP Publicado E2E");
  const updatedTitle = `${postTitle} Editado`;

  await editorPage.goto("/pt-BR/publicar");

  await editorPage.locator('input[name="title"]').fill(postTitle);
  await editorPage.locator('input[name="work_title"]').fill("Obra de Teste");
  await editorPage.locator('input[name="description"]').fill("Descrição publicada por E2E");
  await editorPage.setInputFiles('input[name="media_assets[]"]', tinyPngFilePayload("post.png"));

  await editorPage.getByRole("button", { name: "Publicar episódio" }).click();
  await expect(editorPage).toHaveURL(/\/pt-BR\/post\/\d+/);

  const postUrl = editorPage.url();
  const postIdMatch = postUrl.match(/\/post\/(\d+)/);
  expect(postIdMatch).toBeTruthy();
  const postId = Number(postIdMatch?.[1]);

  const postActionsMenu = editorPage.getByRole("button", { name: "Mais ações do episódio" }).first();
  await postActionsMenu.click();
  await expect(editorPage.getByRole("button", { name: "Excluir episódio" })).toHaveCount(0);
  const editorPostCard = editorPage.locator(`#post-${postId}`);
  await editorPostCard.getByRole("link", { name: "Editar episódio" }).click();

  await expect(editorPage).toHaveURL(new RegExp(`/pt-BR/post/${postId}/editar`));
  await editorPage.locator('input[name="title"]').fill(updatedTitle);
  await editorPage.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(editorPage).toHaveURL(new RegExp(`/pt-BR/post/${postId}\\?updated=1`));
  await expect(editorPage.getByText(updatedTitle)).toBeVisible();

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto(`/pt-BR/post/${postId}`);
  const ownerPostCard = ownerPage.locator(`#post-${postId}`);
  await ownerPostCard.getByRole("button", { name: "Mais ações do episódio" }).click();

  ownerPage.on("dialog", (dialog) => dialog.accept());
  await ownerPostCard.getByRole("button", { name: "Excluir episódio" }).click();
  await expect(ownerPage.locator(`#post-${postId}`)).toHaveCount(0);

  const deletedResponse = await request.get(`${API_BASE_URL}/posts/${postId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${owner.token}`,
    },
  });
  expect(deletedResponse.status()).toBe(404);

  await editorContext.close();
  await ownerContext.close();
});
