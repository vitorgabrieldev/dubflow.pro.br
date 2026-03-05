import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import type {
  ApiList,
  AchievementCatalogResponse,
  AchievementFeedItem,
  DubbingTest,
  DubbingTestSubmission,
  DashboardOverview,
  NotificationItem,
  Organization,
  Playlist,
  Post,
  RisingDubberInsight,
  PublishOrganizationOption,
  UserPreview,
} from "@/types/api";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

async function getJson<T>(path: string, token?: string): Promise<T> {
  const isAuthenticated = Boolean(token);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(isAuthenticated ? { cache: "no-store" as const } : { next: { revalidate: 20 } }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchFeedPage({
  token,
  page = 1,
  perPage = 12,
  q,
  mediaType,
  languageCode,
  organization,
  playlistId,
  tag,
}: {
  token?: string;
  page?: number;
  perPage?: number;
  q?: string;
  mediaType?: string;
  languageCode?: string;
  organization?: string;
  playlistId?: number;
  tag?: string;
} = {}): Promise<ApiList<Post>> {
  return getJson<ApiList<Post>>(
    `/posts${buildQuery({
      page,
      per_page: perPage,
      q,
      media_type: mediaType,
      language_code: languageCode,
      organization,
      playlist_id: playlistId,
      tag,
    })}`,
    token
  );
}

export async function fetchFeed(token?: string): Promise<Post[]> {
  try {
    const payload = await fetchFeedPage({ token, perPage: 30 });
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchOrganizationsPage({
  token,
  page = 1,
  perPage = 12,
  q,
  sort,
  visibility,
  onlyJoined,
  discoverPrivate,
}: {
  token?: string;
  page?: number;
  perPage?: number;
  q?: string;
  sort?: "recent" | "followers" | "playlists" | "name";
  visibility?: "public" | "private";
  onlyJoined?: boolean;
  discoverPrivate?: boolean;
} = {}): Promise<ApiList<Organization>> {
  const normalizedSort = sort && sort !== "recent" ? sort : undefined;

  return getJson<ApiList<Organization>>(
    `/organizations${buildQuery({
      page,
      per_page: perPage,
      q,
      visibility,
      sort: normalizedSort,
      only_joined: onlyJoined ? 1 : undefined,
      discover_private: discoverPrivate ? 1 : undefined,
    })}`,
    token
  );
}

export async function fetchOrganizations(token?: string): Promise<Organization[]> {
  try {
    const payload = await fetchOrganizationsPage({
      token,
      perPage: 8,
      visibility: token ? undefined : "public",
    });

    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchPlaylistsPage({
  token,
  page = 1,
  perPage = 12,
  q,
  organization,
  user,
  visibility,
  sort,
}: {
  token?: string;
  page?: number;
  perPage?: number;
  q?: string;
  organization?: string;
  user?: string;
  visibility?: "public" | "private" | "unlisted";
  sort?: "recent" | "popular" | "title";
} = {}): Promise<ApiList<Playlist>> {
  const normalizedSort = sort && sort !== "recent" ? sort : undefined;

  return getJson<ApiList<Playlist>>(
    `/playlists${buildQuery({
      page,
      per_page: perPage,
      q,
      organization,
      user,
      visibility,
      sort: normalizedSort,
    })}`,
    token
  );
}

export async function fetchPlaylists(token?: string): Promise<Playlist[]> {
  try {
    const payload = await fetchPlaylistsPage({
      token,
      perPage: 8,
    });

    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchMyOrganizations(token?: string): Promise<Organization[]> {
  if (!token) {
    return [];
  }

  try {
    const payload = await getJson<ApiList<Organization>>("/my-organizations?per_page=50", token);
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchDashboardOverview(token?: string): Promise<DashboardOverview | null> {
  if (!token) {
    return null;
  }

  try {
    return await getJson<DashboardOverview>("/dashboard/overview", token);
  } catch {
    return null;
  }
}

export async function fetchMyAchievements(token?: string): Promise<AchievementCatalogResponse | null> {
  if (!token) {
    return null;
  }

  try {
    return await getJson<AchievementCatalogResponse>("/achievements/me", token);
  } catch {
    return null;
  }
}

export async function fetchAchievementFeed(token?: string): Promise<AchievementFeedItem[]> {
  if (!token) {
    return [];
  }

  try {
    const payload = await getJson<ApiList<AchievementFeedItem>>("/achievements/feed?per_page=8", token);
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchRisingDubbers30Days(token?: string): Promise<RisingDubberInsight[]> {
  if (!token) {
    return [];
  }

  try {
    const payload = await getJson<{ data?: RisingDubberInsight[] }>("/dashboard/rising-dubbers?limit=5", token);
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchCurrentUser(token?: string): Promise<UserPreview | null> {
  if (!token) {
    return null;
  }

  try {
    const payload = await getJson<{ user?: UserPreview }>("/auth/me", token);
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export async function fetchNotifications(
  token?: string,
  perPage = 100
): Promise<{ items: ApiList<NotificationItem>; unread_count: number } | null> {
  if (!token) {
    return null;
  }

  try {
    return await getJson<{ items: ApiList<NotificationItem>; unread_count: number }>(`/notifications?per_page=${perPage}`, token);
  } catch {
    return null;
  }
}

export async function markAllNotificationsAsRead(token?: string): Promise<void> {
  if (!token) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    // Ignore read-all failures on automatic read.
  }
}

export async function fetchPublishOptions(token?: string): Promise<PublishOrganizationOption[]> {
  if (!token) {
    return [];
  }

  try {
    const payload = await getJson<{ organizations?: PublishOrganizationOption[] }>("/publish/options", token);
    return payload.organizations ?? [];
  } catch {
    return [];
  }
}

export async function fetchDubbingTestOpportunitiesPage({
  token,
  page = 1,
  perPage = 12,
  q,
  visibility,
  appearance,
}: {
  token?: string;
  page?: number;
  perPage?: number;
  q?: string;
  visibility?: "internal" | "external";
  appearance?: "protagonista" | "coadjuvante" | "pontas" | "figurante" | "voz_adicional";
} = {}): Promise<ApiList<DubbingTest>> {
  return getJson<ApiList<DubbingTest>>(
    `/dubbing-tests/opportunities${buildQuery({
      page,
      per_page: perPage,
      q,
      visibility,
      appearance,
    })}`,
    token
  );
}

export async function fetchDubbingTestDetails(
  testId: number,
  token?: string
): Promise<DubbingTest | null> {
  try {
    const payload = await getJson<{ dubbing_test?: DubbingTest }>(`/dubbing-tests/${testId}`, token);
    return payload.dubbing_test ?? null;
  } catch {
    return null;
  }
}

export async function fetchMyDubbingTestSubmissions(
  testId: number,
  token?: string
): Promise<DubbingTestSubmission[]> {
  if (!token) {
    return [];
  }

  try {
    const payload = await getJson<{ submissions?: DubbingTestSubmission[] }>(
      `/dubbing-tests/${testId}/my-submissions`,
      token
    );
    return payload.submissions ?? [];
  } catch {
    return [];
  }
}

export function toLocalizedPath(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}`;
}

export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const backendRoot = API_BASE_URL.replace(/\/api\/v1$/, "");
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${backendRoot}/api/v1/media/${encodedPath}`;
}
