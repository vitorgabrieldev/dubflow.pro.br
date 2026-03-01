import { expect, test } from "@playwright/test";

test("redirects root to locale feed", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(pt-BR|en|es|ja|fr)$/);
});

test("login page renders required fields", async ({ page }) => {
  await page.goto("/pt-BR/entrar");
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});
