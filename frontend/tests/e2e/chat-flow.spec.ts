import { expect, test } from "@playwright/test";

import {
  createAuthenticatedContext,
  registerUser,
  uniqueLabel,
} from "./utils/e2e-helpers";

test("chat e2e: iniciar conversa, enviar, editar, excluir e bloquear", async ({ browser, page, request }) => {
  test.setTimeout(180_000);

  const sender = await registerUser(request, { namePrefix: "Chat Sender", emailPrefix: "chat.sender" });
  const receiver = await registerUser(request, { namePrefix: "Chat Receiver", emailPrefix: "chat.receiver" });

  const senderContext = await createAuthenticatedContext(browser, sender.token);
  const receiverContext = await createAuthenticatedContext(browser, receiver.token);
  const senderPage = await senderContext.newPage();
  const receiverPage = await receiverContext.newPage();

  const initialMessage = uniqueLabel("Mensagem E2E chat");
  const editedMessage = uniqueLabel("Mensagem editada E2E");
  const blockedMessage = uniqueLabel("Mensagem bloqueada E2E");
  const wavBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
    0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00,
    0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x08, 0x00, 0x00,
  ]);

  await senderPage.goto(`/pt-BR/mensagens?com=${receiver.id}`);
  await expect(senderPage.getByText("Mensagens")).toBeVisible();

  const senderComposer = senderPage.getByPlaceholder("Digite sua mensagem...");
  await senderComposer.click();
  await senderComposer.fill(initialMessage);
  await senderComposer.press("Enter");
  const senderMessageBubble = senderPage.locator("article p.whitespace-pre-wrap", { hasText: initialMessage }).first();
  await expect(senderMessageBubble).toBeVisible();

  await senderPage.locator('input[type="file"]').setInputFiles({
    name: "chat-audio-e2e.wav",
    mimeType: "audio/wav",
    buffer: wavBuffer,
  });
  await senderPage.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(senderPage.getByRole("button", { name: "Reproduzir áudio" }).first()).toBeVisible();
  await expect(senderPage.getByLabel("Progresso do áudio").first()).toBeVisible();
  await expect(senderPage.getByRole("link", { name: "Download" }).first()).toBeVisible();
  await expect(senderPage.locator('select').filter({ hasText: "1x" }).first()).toBeVisible();

  await receiverPage.goto(`/pt-BR/mensagens?com=${sender.id}`);
  await expect(receiverPage.getByText("Mensagens")).toBeVisible();
  const receiverMessageBubble = receiverPage.locator("article p.whitespace-pre-wrap", { hasText: initialMessage }).first();
  await expect(receiverMessageBubble).toBeVisible({ timeout: 20_000 });
  await expect(receiverPage.getByRole("button", { name: "Reproduzir áudio" }).first()).toBeVisible({ timeout: 20_000 });

  await senderMessageBubble.hover();
  await senderPage.getByRole("button", { name: "Ações da mensagem" }).click();
  await senderPage.getByRole("button", { name: "Editar" }).click();

  const inlineEditTextarea = senderPage.locator("article textarea").first();
  await inlineEditTextarea.fill(editedMessage);
  await senderPage.getByRole("button", { name: "Salvar" }).click();
  const editedMessageBubble = senderPage.locator("article p.whitespace-pre-wrap", { hasText: editedMessage }).first();
  await expect(editedMessageBubble).toBeVisible();

  await editedMessageBubble.hover();
  await senderPage.getByRole("button", { name: "Ações da mensagem" }).click();
  await senderPage.getByRole("button", { name: "Excluir" }).click();
  const removedMessageIndicator = senderPage.locator("article strong", { hasText: "Mensagem removida" }).first();
  await expect(removedMessageIndicator).toBeVisible();

  await receiverPage.getByRole("button", { name: "Menu da conversa" }).click();
  await receiverPage.getByRole("button", { name: "Bloquear" }).click();
  await expect(receiverPage.getByText(/Conversas bloqueadas \(\d+\)/)).toBeVisible();

  await senderComposer.fill(blockedMessage);
  await senderComposer.press("Enter");
  const blockedSenderBubble = senderPage.locator("article p.whitespace-pre-wrap", { hasText: blockedMessage }).first();
  await expect(blockedSenderBubble).toBeVisible();

  await expect(
    receiverPage.locator("article p.whitespace-pre-wrap", { hasText: blockedMessage })
  ).toHaveCount(0, { timeout: 8_000 });

  await senderContext.close();
  await receiverContext.close();

  await page.goto("/pt-BR");
  await expect(page).toHaveURL(/\/pt-BR$/);
});
