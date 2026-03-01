import { expect, test } from "@playwright/test";

import {
  createAuthenticatedContext,
  createOrganization,
  getOrganizationRole,
  registerUser,
} from "./utils/e2e-helpers";

test("owner convida membro, membro aceita e aceita transferencia de posse", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const owner = await registerUser(request, { namePrefix: "Owner", emailPrefix: "owner.e2e" });
  const member = await registerUser(request, { namePrefix: "Member", emailPrefix: "member.e2e" });
  const organization = await createOrganization(request, owner.token);

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto(`/pt-BR/organizations/${organization.slug}/convidar`);
  await expect(ownerPage).toHaveURL(new RegExp(`/pt-BR/organizations/${organization.slug}/convidar`));

  await ownerPage.getByPlaceholder("Digite nome ou e-mail").fill(member.email);
  const candidateButton = ownerPage.getByRole("button", { name: new RegExp(member.email, "i") }).first();
  await expect(candidateButton).toBeVisible({ timeout: 10_000 });
  await candidateButton.click();
  await ownerPage.getByRole("button", { name: /^Convidar$/ }).click();
  await expect(ownerPage.getByText(member.email).first()).toBeVisible({ timeout: 10_000 });

  const memberContext = await createAuthenticatedContext(browser, member.token);
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/pt-BR/notificacoes");
  const inviteCard = memberPage.locator("div").filter({ hasText: /Cargo no convite/i }).first();
  await expect(inviteCard).toBeVisible();
  await inviteCard.getByRole("button", { name: "Aceitar" }).click();
  await expect(memberPage).toHaveURL(/invite=accept/);
  await expect(memberPage.getByText("Convite aceito com sucesso.")).toBeVisible();

  await ownerPage.reload();
  await expect(ownerPage.getByText(member.email)).toBeVisible();
  await ownerPage.getByRole("button", { name: "Transferir dono" }).click();
  await expect(ownerPage.getByText(/Pedido de transferência enviado/i)).toBeVisible();

  await memberPage.goto("/pt-BR/notificacoes");
  const transferCard = memberPage.locator("div").filter({ hasText: /se tornar dono da comunidade/i }).first();
  await expect(transferCard).toBeVisible();
  await transferCard.getByRole("button", { name: "Aceitar" }).click();
  await expect(memberPage).toHaveURL(/owner_transfer=accept/);
  await expect(memberPage.getByText(/Transferência de propriedade aceita/i)).toBeVisible();

  const ownerRole = await getOrganizationRole(request, owner.token, organization.slug, owner.id);
  const memberRole = await getOrganizationRole(request, member.token, organization.slug, member.id);

  expect(ownerRole).toBe("admin");
  expect(memberRole).toBe("owner");

  await ownerContext.close();
  await memberContext.close();
});
