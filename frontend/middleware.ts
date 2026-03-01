import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocaleFromAcceptLanguage, type Locale } from "./src/lib/i18n";

function resolveLocaleFromPath(pathname: string, acceptLanguageHeader: string | null): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (SUPPORTED_LOCALES.includes(segment as Locale)) {
    return segment as Locale;
  }

  return resolveLocaleFromAcceptLanguage(acceptLanguageHeader) ?? DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const locale = resolveLocaleFromPath(request.nextUrl.pathname, request.headers.get("accept-language"));
  const headers = new Headers(request.headers);
  headers.set("x-dubflow-locale", locale);
  headers.set("x-dubflow-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
