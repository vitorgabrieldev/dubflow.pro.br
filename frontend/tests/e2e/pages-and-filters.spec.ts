import { expect, test } from "@playwright/test";

import {
  acceptInvite,
  createAuthenticatedContext,
  createDubbingTest,
  createOrganization,
  createPlayableEpisode,
  createPlaylist,
  inviteMember,
  registerUser,
  uniqueLabel,
  updateDubbingTest,
} from "./utils/e2e-helpers";

test("minhas organizacoes, edicao da comunidade e painel renderizam e operam com sucesso", async ({ browser, request }) => {
  test.setTimeout(120_000);

  const owner = await registerUser(request, { namePrefix: "Owner Pages", emailPrefix: "owner.pages" });
  const organization = await createOrganization(request, owner.token, uniqueLabel("Comunidade Paginas E2E"));
  const updatedName = `${organization.name} Atualizada`;

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto("/pt-BR/minhas-organizacoes");
  await expect(ownerPage.getByText("Minhas comunidades")).toBeVisible();
  await expect(ownerPage.getByText(organization.name)).toBeVisible();

  await ownerPage.goto(`/pt-BR/organizations/${organization.slug}/editar`);
  await expect(ownerPage.getByRole("heading", { name: organization.name })).toBeVisible();
  await ownerPage.locator('input[name="name"]').fill(updatedName);
  await ownerPage.locator('textarea[name="description"]').fill("Descrição atualizada por E2E.");
  await ownerPage.getByRole("button", { name: "Salvar comunidade" }).click();

  await expect(ownerPage).toHaveURL(new RegExp(`/pt-BR/organizations/${organization.slug}/editar\\?updated=1`));
  await expect(ownerPage.getByText("Comunidade atualizada com sucesso.")).toBeVisible();

  await ownerPage.goto("/pt-BR/painel");
  await expect(ownerPage.getByText("Minhas comunidades")).toBeVisible();
  await expect(ownerPage.getByText(updatedName)).toBeVisible();
  await expect(ownerPage.getByText("Top posts")).toBeVisible();

  await ownerContext.close();
});

test("perfil publico permite seguir e iniciar mensagem", async ({ browser, request }) => {
  test.setTimeout(120_000);

  const viewer = await registerUser(request, { namePrefix: "Viewer Profile", emailPrefix: "viewer.profile" });
  const target = await registerUser(request, { namePrefix: "Target Profile", emailPrefix: "target.profile" });

  const viewerContext = await createAuthenticatedContext(browser, viewer.token);
  const viewerPage = await viewerContext.newPage();

  await viewerPage.goto(`/pt-BR/perfil/${target.id}`);
  await expect(viewerPage.locator("p").filter({ hasText: target.name }).first()).toBeVisible();

  await viewerPage.getByRole("button", { name: "Seguir" }).click();
  await expect(viewerPage.getByRole("button", { name: "Seguindo" })).toBeVisible();

  await viewerPage.getByRole("button", { name: "Mensagem" }).click();
  await expect(viewerPage).toHaveURL(new RegExp(`/pt-BR/mensagens\\?com=${target.id}`));
  await expect(viewerPage.getByText("Mensagens")).toBeVisible();

  await viewerContext.close();
});

test("listagem de playlists respeita filtro por busca e abre dropdown de episodios", async ({ browser, request }) => {
  test.setTimeout(160_000);

  const owner = await registerUser(request, { namePrefix: "Owner Playlist", emailPrefix: "owner.playlist.list" });
  const organization = await createOrganization(request, owner.token, uniqueLabel("Comunidade Playlist E2E"));
  const targetPlaylist = await createPlaylist(request, owner.token, organization.slug, {
    title: uniqueLabel("Playlist Filtro Alpha"),
  });
  const otherPlaylist = await createPlaylist(request, owner.token, organization.slug, {
    title: uniqueLabel("Playlist Filtro Beta"),
  });
  const playableEpisode = await createPlayableEpisode(request, owner.token, organization.slug, {
    playlistId: targetPlaylist.id,
    seasonNumber: 1,
  });

  const ownerContext = await createAuthenticatedContext(browser, owner.token);
  const ownerPage = await ownerContext.newPage();

  const filterTerm = targetPlaylist.title.split(" ").slice(-1)[0] ?? targetPlaylist.title;
  await ownerPage.goto(`/pt-BR/playlists?q=${encodeURIComponent(filterTerm)}`);

  await expect(ownerPage.getByText(targetPlaylist.title)).toBeVisible();
  await expect(ownerPage.getByText(otherPlaylist.title)).toHaveCount(0);

  const targetPlaylistCard = ownerPage.locator("div").filter({ hasText: targetPlaylist.title }).first();
  await targetPlaylistCard.getByRole("button", { name: /Assistir/i }).click();

  await expect(ownerPage.getByText("Temporada 1")).toBeVisible({ timeout: 20_000 });
  await expect(ownerPage.getByText(playableEpisode.title)).toBeVisible({ timeout: 20_000 });

  await ownerContext.close();
});

test("tela de oportunidades aplica filtros de busca, tipo e aparicao", async ({ browser, request }) => {
  test.setTimeout(180_000);

  const owner = await registerUser(request, { namePrefix: "Owner Opp Filters", emailPrefix: "owner.opp.filters" });
  const member = await registerUser(request, { namePrefix: "Member Opp Filters", emailPrefix: "member.opp.filters" });
  const organization = await createOrganization(request, owner.token, uniqueLabel("Comunidade Oportunidade Filtros"));

  await inviteMember(request, owner.token, organization.slug, member.id, "member");
  await acceptInvite(request, member.token, organization.slug);

  const internalTitle = uniqueLabel("Oportunidade Interna Protagonista");
  const externalTitle = uniqueLabel("Oportunidade Externa Coadjuvante");

  const internalTest = await createDubbingTest(request, owner.token, organization.slug, {
    title: internalTitle,
    visibility: "internal",
    characters: [{ name: "Heroi", appearance_estimate: "protagonista" }],
  });
  const externalTest = await createDubbingTest(request, owner.token, organization.slug, {
    title: externalTitle,
    visibility: "external",
    characters: [{ name: "Companheiro", appearance_estimate: "coadjuvante" }],
  });

  await updateDubbingTest(request, owner.token, organization.slug, internalTest.id, { status: "published" });
  await updateDubbingTest(request, owner.token, organization.slug, externalTest.id, { status: "published" });

  const memberContext = await createAuthenticatedContext(browser, member.token);
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/pt-BR/oportunidades");
  await expect(memberPage.getByRole("heading", { name: "Teste de dublagem aberto" })).toBeVisible();

  const searchInput = memberPage.getByPlaceholder("Buscar por teste, comunidade ou personagem...");
  await searchInput.fill("Oportunidade");
  await memberPage.getByRole("button", { name: "Interno" }).click();
  await memberPage.getByRole("button", { name: "Protagonista" }).click();
  await memberPage.getByRole("button", { name: "Aplicar" }).click();

  await expect(memberPage).toHaveURL(/\/pt-BR\/oportunidades\?/);
  await expect(memberPage).toHaveURL(/visibility=internal/);
  await expect(memberPage).toHaveURL(/appearance=protagonista/);

  await expect(memberPage.getByText(internalTitle)).toBeVisible();
  await expect(memberPage.getByText(externalTitle)).toHaveCount(0);

  await memberContext.close();
});
