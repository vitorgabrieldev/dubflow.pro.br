import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n";

export default async function RootPage() {
  const headerStore = await headers();
  const locale = resolveLocaleFromAcceptLanguage(headerStore.get("accept-language"));

  redirect(`/${locale}`);
}
