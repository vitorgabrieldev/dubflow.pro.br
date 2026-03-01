import { expect, test } from "@playwright/test";

import { createAuthenticatedContext, registerUser } from "./utils/e2e-helpers";

test("perfil mostra preview compacto de conquistas e página completa paginada", async ({ browser, request }) => {
  test.setTimeout(90_000);

  const user = await registerUser(request, {
    namePrefix: "Achievements User",
    emailPrefix: "achievements.user",
  });

  const context = await createAuthenticatedContext(browser, user.token);
  const page = await context.newPage();

  await page.goto("/pt-BR/perfil");

  await expect(page.getByText("Conquistas", { exact: true })).toBeVisible();
  const viewMoreLinks = page.getByRole("link", { name: "Ver mais" });
  await expect(viewMoreLinks).toHaveCount(2);
  await viewMoreLinks.nth(1).click();

  await expect(page).toHaveURL(/\/pt-BR\/perfil\/\d+\/conquistas(\?.*)?$/);
  await expect(page.getByText(/Conquistas de /)).toBeVisible();
  await expect(page.getByText(/Página \d+ de \d+/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Próxima" })).toBeVisible();

  await context.close();
});
