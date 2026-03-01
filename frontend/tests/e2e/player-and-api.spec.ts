import { expect, test } from "@playwright/test";

import {
  createAuthenticatedContext,
  createOrganization,
  createPlayableEpisode,
  createPlaylist,
  registerUser,
  uniqueLabel,
} from "./utils/e2e-helpers";

test("player e proxies de playlists: API responde e controles do player funcionam", async ({ browser, page, request }) => {
  test.setTimeout(180_000);

  const owner = await registerUser(request, { namePrefix: "Owner Player", emailPrefix: "owner.player" });
  const organization = await createOrganization(request, owner.token, uniqueLabel("Comunidade Player E2E"));
  const playlist = await createPlaylist(request, owner.token, organization.slug, {
    title: uniqueLabel("Playlist API Player E2E"),
  });

  const firstEpisode = await createPlayableEpisode(request, owner.token, organization.slug, {
    playlistId: playlist.id,
    seasonNumber: 1,
    title: uniqueLabel("Ep 1 Player E2E"),
  });

  await createPlayableEpisode(request, owner.token, organization.slug, {
    playlistId: playlist.id,
    seasonNumber: 1,
    title: uniqueLabel("Ep 2 Player E2E"),
  });

  const listResponse = await page.request.get(`/api/playlists/list?per_page=20&q=${encodeURIComponent(playlist.title)}`);
  expect(listResponse.ok()).toBeTruthy();
  const listPayload = (await listResponse.json()) as { data?: Array<{ id: number; title?: string }> };
  expect((listPayload.data ?? []).some((item) => item.id === playlist.id)).toBeTruthy();

  const episodesResponse = await page.request.get(`/api/playlists/${organization.slug}/${playlist.id}/episodes`);
  expect(episodesResponse.ok()).toBeTruthy();
  const episodesPayload = (await episodesResponse.json()) as { episodes?: Array<{ id: number }> };
  expect((episodesPayload.episodes ?? []).some((item) => item.id === firstEpisode.id)).toBeTruthy();

  const unauthCreateResponse = await page.request.post("/api/playlists/create", {
    headers: {
      Accept: "application/json",
    },
    form: {
      locale: "pt-BR",
      organization_slug: organization.slug,
      title: "Playlist sem auth",
      release_year: "2026",
    },
  });
  expect(unauthCreateResponse.status()).toBe(401);

  const context = await createAuthenticatedContext(browser, owner.token);
  const watchPage = await context.newPage();

  await watchPage.goto(`/pt-BR/playlists/${organization.slug}/${playlist.id}`);
  await watchPage.getByRole("button", { name: /^Assistir$/ }).click();
  await watchPage.getByRole("button", { name: firstEpisode.title }).click();

  await expect(watchPage).toHaveURL(new RegExp(`/pt-BR/playlists/${organization.slug}/${playlist.id}/watch\\?episode=\\d+`));
  const progressSlider = watchPage.getByRole("slider", { name: "Progresso do vídeo" });
  const hasVideoControls = (await progressSlider.count()) > 0;

  if (hasVideoControls) {
    await expect(progressSlider).toBeVisible();

    const playPauseButton = watchPage.getByRole("button", { name: /Pausar|Reproduzir/ }).first();
    await expect(playPauseButton).toBeVisible();
    const beforeLabel = (await playPauseButton.getAttribute("aria-label")) ?? "";
    await playPauseButton.click();
    const afterLabel = (await playPauseButton.getAttribute("aria-label")) ?? "";
    expect(beforeLabel).not.toEqual(afterLabel);

    const muteButton = watchPage.getByRole("button", { name: /Silenciar|Ativar som/ }).first();
    const muteBefore = (await muteButton.getAttribute("aria-label")) ?? "";
    await muteButton.click();
    const muteAfter = (await muteButton.getAttribute("aria-label")) ?? "";
    expect(muteBefore).not.toEqual(muteAfter);
  } else {
    await expect(watchPage.locator("audio[controls]")).toBeVisible();
  }

  await watchPage.getByRole("button", { name: "Fechar player" }).click();
  await expect(watchPage).toHaveURL(`/pt-BR/playlists/${organization.slug}/${playlist.id}`);

  await context.close();
});
