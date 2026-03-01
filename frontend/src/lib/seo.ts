import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

export const SEO_APP_NAME = "DubFlow";
export const SEO_DEFAULT_IMAGE = "/Opengraph.png";
export const SEO_DEFAULT_DESCRIPTION = "Portfólio de dublagens para comunidades.";

function ensureProtocol(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export function getSiteUrl(): string {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (explicitSiteUrl) {
    return ensureProtocol(explicitSiteUrl).replace(/\/$/, "");
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicAppUrl) {
    return ensureProtocol(publicAppUrl).replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return ensureProtocol(vercelUrl).replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function toLocalePath(locale: Locale, pathWithoutLocale = "/"): string {
  const normalized =
    pathWithoutLocale === "/"
      ? ""
      : pathWithoutLocale.startsWith("/")
        ? pathWithoutLocale
        : `/${pathWithoutLocale}`;

  return `/${locale}${normalized}`;
}

export function parseLocalizedPathname(pathname: string, fallbackLocale: Locale = DEFAULT_LOCALE): {
  locale: Locale;
  pathWithoutLocale: string;
} {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = SUPPORTED_LOCALES.includes(firstSegment as Locale);
  const locale = hasLocalePrefix ? (firstSegment as Locale) : fallbackLocale;
  const pathSegments = hasLocalePrefix ? segments.slice(1) : segments;
  const tail = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";

  return {
    locale,
    pathWithoutLocale: tail,
  };
}

export function buildLocaleAlternates(pathWithoutLocale = "/"): Record<Locale, string> {
  const alternates = {} as Record<Locale, string>;

  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = toLocalePath(locale, pathWithoutLocale);
  }

  return alternates;
}
