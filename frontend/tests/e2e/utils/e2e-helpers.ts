import { expect, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test";

type E2EUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  token: string;
};

type E2EOrganization = {
  id: number;
  name: string;
  slug: string;
};

type E2EPost = {
  id: number;
  title: string;
};

type E2EPlaylist = {
  id: number;
  title: string;
  slug: string;
};

type E2EDubbingTest = {
  id: number;
  title: string;
  status: "draft" | "published" | "closed" | "results_released" | "archived";
  characters: Array<{ id: number; name: string }>;
};

const E2E_BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:18000";
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? `${E2E_BACKEND_URL}/api/v1`;
const APP_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const DEFAULT_PASSWORD = "Test@12345";
const PNG_1X1_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XJ6sAAAAASUVORK5CYII=",
  "base64"
);
const WAV_TINY_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
  0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
  0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
]);

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueLabel(prefix: string) {
  return `${prefix}-${uniqueSuffix()}`;
}

export async function registerUser(
  request: APIRequestContext,
  {
    namePrefix = "E2E User",
    emailPrefix = "e2e.user",
    password = DEFAULT_PASSWORD,
  }: {
    namePrefix?: string;
    emailPrefix?: string;
    password?: string;
  } = {}
): Promise<E2EUser> {
  const suffix = uniqueSuffix();
  const name = `${namePrefix} ${suffix}`;
  const email = `${emailPrefix}.${suffix}@example.com`;

  const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name,
      email,
      password,
      password_confirmation: password,
      locale: "pt-BR",
    },
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await registerResponse.json().catch(() => ({}))) as {
    access_token?: string;
    user?: { id: number; name: string; email: string };
  };

  expect(registerResponse.ok(), `register user failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.access_token).toBeTruthy();
  expect(payload.user?.id).toBeTruthy();

  let token = payload.access_token!;

  const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!meResponse.ok()) {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email,
        password,
      },
      headers: {
        Accept: "application/json",
      },
    });

    const loginPayload = (await loginResponse.json().catch(() => ({}))) as {
      access_token?: string;
    };

    expect(loginResponse.ok(), `login fallback failed: ${JSON.stringify(loginPayload)}`).toBeTruthy();
    expect(loginPayload.access_token).toBeTruthy();
    token = loginPayload.access_token!;
  }

  return {
    id: payload.user!.id,
    name,
    email,
    password,
    token,
  };
}

export async function createAuthenticatedContext(browser: Browser, token: string): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: APP_BASE_URL,
    locale: "pt-BR",
  });

  await context.addCookies([
    {
      name: "ed_token",
      value: token,
      url: APP_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: APP_BASE_URL.startsWith("https://"),
    },
  ]);

  return context;
}

export async function createOrganization(
  request: APIRequestContext,
  token: string,
  name = uniqueLabel("Comunidade E2E")
): Promise<E2EOrganization> {
  const response = await request.post(`${API_BASE_URL}/organizations`, {
    data: {
      name,
      description: "Comunidade criada via testes E2E",
      is_public: true,
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    organization?: { id: number; name: string; slug: string };
    message?: string;
  };

  expect(response.ok(), `create organization failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.organization?.slug).toBeTruthy();

  return {
    id: payload.organization!.id,
    name: payload.organization!.name,
    slug: payload.organization!.slug,
  };
}


export async function inviteMember(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  userId: number,
  role: "admin" | "editor" | "member" = "editor"
) {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/members`, {
    data: {
      user_id: userId,
      role,
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  expect(response.ok(), `invite member failed: ${JSON.stringify(payload)}`).toBeTruthy();
}

export async function acceptInvite(request: APIRequestContext, token: string, organizationSlug: string) {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/members/accept`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  expect(response.ok(), `accept invite failed: ${JSON.stringify(payload)}`).toBeTruthy();
}

export async function getOrganizationRole(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  userId: number
): Promise<string | null> {
  const response = await request.get(`${API_BASE_URL}/organizations/${organizationSlug}/members?per_page=100`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: Array<{ role: string; user?: { id: number } }>;
  };

  expect(response.ok(), "failed to load organization members").toBeTruthy();

  return payload.data?.find((item) => item.user?.id === userId)?.role ?? null;
}

export async function createPost(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  {
    title = uniqueLabel("Episodio E2E"),
    workTitle = "Obra E2E",
    description = "Publicado automaticamente por E2E",
  }: {
    title?: string;
    workTitle?: string;
    description?: string;
  } = {}
): Promise<E2EPost> {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/posts`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      title,
      description,
      language_code: "pt-BR",
      work_title: workTitle,
      allow_comments: "1",
      show_likes_count: "1",
      show_views_count: "1",
      "media_assets[]": {
        name: "asset.png",
        mimeType: "image/png",
        buffer: PNG_1X1_BUFFER,
      },
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    post?: { id: number; title: string };
    message?: string;
  };

  expect(response.ok(), `create post failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.post?.id).toBeTruthy();

  return {
    id: payload.post!.id,
    title: payload.post!.title,
  };
}

export async function createPlaylist(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  {
    title = uniqueLabel("Playlist E2E"),
    workTitle = "Obra Playlist E2E",
    description = "Playlist criada automaticamente por E2E",
    releaseYear = 2026,
  }: {
    title?: string;
    workTitle?: string;
    description?: string;
    releaseYear?: number;
  } = {}
): Promise<E2EPlaylist> {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/playlists`, {
    data: {
      title,
      work_title: workTitle,
      description,
      release_year: releaseYear,
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    playlist?: { id: number; title: string; slug: string };
    message?: string;
  };

  expect(response.ok(), `create playlist failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.playlist?.id).toBeTruthy();

  return {
    id: payload.playlist!.id,
    title: payload.playlist!.title,
    slug: payload.playlist!.slug,
  };
}

export async function createPlayableEpisode(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  {
    playlistId,
    seasonNumber,
    title = uniqueLabel("Episodio Reproduzivel E2E"),
    workTitle = "Obra Episodio E2E",
    description = "Episodio com áudio para fluxo de player E2E",
  }: {
    playlistId: number;
    seasonNumber: number;
    title?: string;
    workTitle?: string;
    description?: string;
  }
): Promise<E2EPost> {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/posts`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      title,
      description,
      language_code: "pt-BR",
      work_title: workTitle,
      allow_comments: "1",
      show_likes_count: "1",
      show_views_count: "1",
      playlist_id: String(playlistId),
      season_number: String(seasonNumber),
      duration_seconds: "180",
      "media_assets[]": {
        name: "asset.wav",
        mimeType: "audio/wav",
        buffer: WAV_TINY_BUFFER,
      },
      thumbnail: {
        name: "thumb.png",
        mimeType: "image/png",
        buffer: PNG_1X1_BUFFER,
      },
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    post?: { id: number; title: string };
    message?: string;
  };

  expect(response.ok(), `create playable episode failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.post?.id).toBeTruthy();

  return {
    id: payload.post!.id,
    title: payload.post!.title,
  };
}

export function tinyPngFilePayload(fileName = "thumb.png") {
  return {
    name: fileName,
    mimeType: "image/png",
    buffer: PNG_1X1_BUFFER,
  };
}

export async function createDubbingTest(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  {
    title = uniqueLabel("Teste E2E"),
    description = "Teste criado via E2E",
    visibility = "external",
    startsAt = new Date(Date.now() - 60 * 60 * 1000),
    endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    resultsReleaseAt = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    characters = [{ name: "Personagem E2E", appearance_estimate: "coadjuvante" as const }],
  }: {
    title?: string;
    description?: string;
    visibility?: "internal" | "external";
    startsAt?: Date;
    endsAt?: Date;
    resultsReleaseAt?: Date;
    characters?: Array<{
      name: string;
      description?: string;
      expectations?: string;
      appearance_estimate: "protagonista" | "coadjuvante" | "pontas" | "figurante" | "voz_adicional";
    }>;
  } = {}
): Promise<E2EDubbingTest> {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationSlug}/dubbing-tests`, {
    data: {
      title,
      description,
      visibility,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      results_release_at: resultsReleaseAt.toISOString(),
      characters,
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    dubbing_test?: {
      id: number;
      title: string;
      status: E2EDubbingTest["status"];
      characters?: Array<{ id: number; name: string }>;
    };
    message?: string;
  };

  expect(response.ok(), `create dubbing test failed: ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.dubbing_test?.id).toBeTruthy();

  return {
    id: payload.dubbing_test!.id,
    title: payload.dubbing_test!.title,
    status: payload.dubbing_test!.status,
    characters: payload.dubbing_test?.characters ?? [],
  };
}

export async function updateDubbingTest(
  request: APIRequestContext,
  token: string,
  organizationSlug: string,
  testId: number,
  data: Record<string, unknown>
) {
  const response = await request.patch(`${API_BASE_URL}/organizations/${organizationSlug}/dubbing-tests/${testId}`, {
    data,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  expect(response.ok(), `update dubbing test failed: ${JSON.stringify(payload)}`).toBeTruthy();
}
