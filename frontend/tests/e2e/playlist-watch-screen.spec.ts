import { expect, test } from "@playwright/test";

import {
  createAuthenticatedContext,
  createOrganization,
  createPlayableEpisode,
  createPlaylist,
  registerUser,
  uniqueLabel,
} from "./utils/e2e-helpers";

test("player em tela única: dropdown de episódios no botão ao lado do X e retorno para detalhes", async ({ browser, request, page }) => {
  test.setTimeout(120_000);

  const owner = await registerUser(request, { namePrefix: "Owner Watch", emailPrefix: "owner.watch" });
  const organization = await createOrganization(request, owner.token, uniqueLabel("Comunidade Watch E2E"));
  const playlist = await createPlaylist(request, owner.token, organization.slug, {
    title: uniqueLabel("Playlist Watch E2E"),
  });

  const episodeSeason1 = await createPlayableEpisode(request, owner.token, organization.slug, {
    playlistId: playlist.id,
    seasonNumber: 1,
    title: uniqueLabel("Ep S1 Watch"),
  });

  const episodeSeason2 = await createPlayableEpisode(request, owner.token, organization.slug, {
    playlistId: playlist.id,
    seasonNumber: 2,
    title: uniqueLabel("Ep S2 Watch"),
  });

  const context = await createAuthenticatedContext(browser, owner.token);
  const watchPage = await context.newPage();

  await watchPage.goto(`/pt-BR/playlists/${organization.slug}/${playlist.id}`);

  await watchPage.getByRole("button", { name: /^Assistir$/ }).click();
  await watchPage.getByRole("button", { name: episodeSeason1.title }).click();

  await expect(watchPage).toHaveURL(new RegExp(`/pt-BR/playlists/${organization.slug}/${playlist.id}/watch\\?episode=\\d+`));

  await watchPage.keyboard.press("Escape");
  await expect(watchPage).toHaveURL(new RegExp(`/pt-BR/playlists/${organization.slug}/${playlist.id}/watch\\?episode=\\d+`));

  await watchPage.getByRole("button", { name: "Abrir episódios" }).click();
  await expect(watchPage.getByRole("button", { name: "Temporada 1" })).toBeVisible();
  await expect(watchPage.getByRole("button", { name: "Temporada 2" })).toBeVisible();

  await watchPage.getByRole("button", { name: "Temporada 2" }).click();
  await watchPage.getByRole("button", { name: episodeSeason2.title }).click();

  await expect(watchPage.getByText(episodeSeason2.title)).toBeVisible();

  await watchPage.getByRole("button", { name: "Fechar player" }).click();
  await expect(watchPage).toHaveURL(`/pt-BR/playlists/${organization.slug}/${playlist.id}`);

  await context.close();

  await page.goto("/pt-BR");
  await expect(page).toHaveURL(/\/pt-BR$/);
});
