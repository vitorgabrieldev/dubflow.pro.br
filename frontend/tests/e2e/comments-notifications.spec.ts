import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  acceptInvite,
  createAuthenticatedContext,
  createOrganization,
  createPost,
  inviteMember,
  registerUser,
} from "./utils/e2e-helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18000/api/v1";

async function createCommentViaApi(request: APIRequestContext, token: string, postId: number, body: string) {
  const response = await request.post(`${API_BASE_URL}/posts/${postId}/comments`, {
    data: {
      body,
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
}

test("comentarios paginados e notificacao de resposta em comentario", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const owner = await registerUser(request, { namePrefix: "Owner", emailPrefix: "owner.comment" });
  const member = await registerUser(request, { namePrefix: "Member", emailPrefix: "member.comment" });
  const organization = await createOrganization(request, owner.token);

  await inviteMember(request, owner.token, organization.slug, member.id, "editor");
  await acceptInvite(request, member.token, organization.slug);

  const post = await createPost(request, owner.token, organization.slug, { title: "Post de Comentarios E2E" });

  await createCommentViaApi(request, member.token, post.id, "Comentário 1 E2E");
  await createCommentViaApi(request, member.token, post.id, "Comentário 2 E2E");
  await createCommentViaApi(request, member.token, post.id, "Comentário 3 E2E");

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(`/pt-BR/post/${post.id}`);

  await expect(ownerPage.getByText("Mostrando 2 de 3 comentários")).toBeVisible();
  await ownerPage.getByRole("button", { name: "Carregar mais" }).click();
  await expect(ownerPage.getByText("Mostrando 3 de 3 comentários")).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: "Ocultar comentários" })).toBeVisible();

  const rootComment = ownerPage.locator("div.rounded-\\[6px\\]").filter({ hasText: "Comentário 3 E2E" }).first();
  await rootComment.getByRole("button", { name: "Responder" }).click();
  const replyInput = rootComment.getByPlaceholder("Responder comentário");
  await replyInput.fill("Resposta do dono E2E");
  await replyInput.press("Enter");

  await expect(ownerPage.getByText("Resposta do dono E2E")).toBeVisible();

  const memberContext = await createAuthenticatedContext(browser, member.token);
  const memberPage = await memberContext.newPage();
  await memberPage.goto("/pt-BR/notificacoes");

  await expect(memberPage.getByText("Responderam seu comentário")).toBeVisible();
  await expect(memberPage.getByText(/Resposta do dono E2E|respondeu seu comentário/i)).toBeVisible();

  await ownerContext.close();
  await memberContext.close();
});
