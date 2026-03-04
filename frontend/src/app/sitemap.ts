import type { MetadataRoute } from "next";

import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { getSiteUrl, toLocalePath } from "@/lib/seo";

const API_BASE_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type PaginatedResponse<T> = {
  data?: T[];
  current_page?: number;
  last_page?: number;
};

type OrganizationItem = {
  slug: string;
  updated_at?: string;
};

type PlaylistItem = {
  id: number;
  organization?: {
    slug?: string;
  };
  updated_at?: string;
};

type PostItem = {
  id: number;
  updated_at?: string;
};

type OpportunityItem = {
  id: number;
  updated_at?: string;
};

function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}

function localeEntries(pathWithoutLocale: string, options?: Omit<MetadataRoute.Sitemap[number], "url">): MetadataRoute.Sitemap {
  return SUPPORTED_LOCALES.map((locale) => ({
    url: absoluteUrl(toLocalePath(locale, pathWithoutLocale)),
    ...options,
  }));
}

async function fetchPage<T>(resource: string, page: number, perPage = 100): Promise<PaginatedResponse<T> | null> {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const response = await fetch(`${API_BASE_URL}${resource}?${query.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 1800 },
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as PaginatedResponse<T> | null;
}

async function fetchCollection<T>(resource: string, limitPages = 5): Promise<T[]> {
  const firstPage = await fetchPage<T>(resource, 1);
  if (!firstPage) {
    return [];
  }

  const lastPage = Math.max(1, Math.min(firstPage.last_page ?? 1, limitPages));
  const items = [...(firstPage.data ?? [])];

  if (lastPage === 1) {
    return items;
  }

  for (let page = 2; page <= lastPage; page += 1) {
    const nextPage = await fetchPage<T>(resource, page);
    if (!nextPage?.data?.length) {
      continue;
    }

    items.push(...nextPage.data);
  }

  return items;
}

function updatedAt(value?: string): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  entries.push(...localeEntries("/", { changeFrequency: "hourly", priority: 1 }));
  entries.push(...localeEntries("/comunidades", { changeFrequency: "hourly", priority: 0.9 }));
  entries.push(...localeEntries("/playlists", { changeFrequency: "hourly", priority: 0.9 }));
  entries.push(...localeEntries("/oportunidades", { changeFrequency: "hourly", priority: 0.9 }));
  entries.push(...localeEntries("/status", { changeFrequency: "daily", priority: 0.4 }));

  const [organizations, playlists, posts, opportunities] = await Promise.all([
    fetchCollection<OrganizationItem>("/organizations", 8),
    fetchCollection<PlaylistItem>("/playlists", 8),
    fetchCollection<PostItem>("/posts", 8),
    fetchCollection<OpportunityItem>("/dubbing-tests/opportunities", 8),
  ]);

  for (const organization of organizations) {
    if (!organization.slug) {
      continue;
    }

    entries.push(
      ...localeEntries(`/organizations/${organization.slug}`, {
        lastModified: updatedAt(organization.updated_at),
        changeFrequency: "daily",
        priority: 0.8,
      })
    );
  }

  for (const playlist of playlists) {
    const organizationSlug = playlist.organization?.slug;
    if (!organizationSlug || !playlist.id) {
      continue;
    }

    entries.push(
      ...localeEntries(`/playlists/${organizationSlug}/${playlist.id}`, {
        lastModified: updatedAt(playlist.updated_at),
        changeFrequency: "daily",
        priority: 0.8,
      })
    );
  }

  for (const post of posts) {
    if (!post.id) {
      continue;
    }

    entries.push(
      ...localeEntries(`/post/${post.id}`, {
        lastModified: updatedAt(post.updated_at),
        changeFrequency: "daily",
        priority: 0.75,
      })
    );
  }

  for (const opportunity of opportunities) {
    if (!opportunity.id) {
      continue;
    }

    entries.push(
      ...localeEntries(`/oportunidades/${opportunity.id}`, {
        lastModified: updatedAt(opportunity.updated_at),
        changeFrequency: "daily",
        priority: 0.75,
      })
    );
  }

  return entries;
}
