import { expect, test } from "@playwright/test";

import { registerUser } from "./utils/e2e-helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18000/api/v1";

test("fluxo de recuperar senha e redefinir com token funciona de ponta a ponta", async ({ page, request }) => {
  test.setTimeout(120_000);

  const user = await registerUser(request, {
    namePrefix: "Recovery User",
    emailPrefix: "recovery.user",
    password: "Test@12345",
  });

  const newPassword = "Test@98765";

  await page.goto("/pt-BR/recuperar-senha");
  await page.locator('input[name="email"]').fill(user.email);
  await page.getByRole("button", { name: "Enviar recuperação" }).click();

  await expect(page).toHaveURL(/\/pt-BR\/recuperar-senha\?sent=1/);
  await expect(page.getByText("Se o e-mail existir, enviamos instruções de recuperação.")).toBeVisible();

  const debugLink = page.getByRole("link", { name: "Ambiente local: abrir redefinição direto" });
  await expect(debugLink).toBeVisible();
  await debugLink.click();

  await expect(page).toHaveURL(/\/pt-BR\/redefinir-senha\?token=/);
  await page.locator('input[name="password"]').fill(newPassword);
  await page.locator('input[name="password_confirmation"]').fill(newPassword);
  await page.getByRole("button", { name: "Redefinir senha" }).click();

  await expect(page).toHaveURL(/\/pt-BR\/entrar\?reset=1/);

  const oldPasswordLogin = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: user.email,
      password: "Test@12345",
    },
    headers: { Accept: "application/json" },
  });
  expect(oldPasswordLogin.status()).toBe(401);

  const newPasswordLogin = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: user.email,
      password: newPassword,
    },
    headers: { Accept: "application/json" },
  });
  expect(newPasswordLogin.ok()).toBeTruthy();
});

test("redefinir senha com token invalido retorna erro na tela", async ({ page, request }) => {
  test.setTimeout(90_000);

  const user = await registerUser(request, {
    namePrefix: "Recovery Invalid",
    emailPrefix: "recovery.invalid",
    password: "Test@12345",
  });

  await page.goto(`/pt-BR/redefinir-senha?token=token-invalido&email=${encodeURIComponent(user.email)}`);
  await page.locator('input[name="password"]').fill("Test@00001");
  await page.locator('input[name="password_confirmation"]').fill("Test@00001");
  await page.getByRole("button", { name: "Redefinir senha" }).click();

  await expect(page).toHaveURL(/\/pt-BR\/redefinir-senha\?error=1/);
  await expect(page.getByText("Não foi possível redefinir a senha com os dados informados.")).toBeVisible();
});
