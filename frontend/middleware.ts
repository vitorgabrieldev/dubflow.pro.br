import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./src/lib/i18n";

function resolveLocaleFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (SUPPORTED_LOCALES.includes(segment as Locale)) {
    return segment as Locale;
  }

  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = resolveLocaleFromPath(pathname);

  if (!locale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  const headers = new Headers(request.headers);
  headers.set("x-dubflow-locale", locale);
  headers.set("x-dubflow-pathname", pathname);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
