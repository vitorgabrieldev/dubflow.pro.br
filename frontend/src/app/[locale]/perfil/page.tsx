import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { fetchCurrentUser } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  const me = await fetchCurrentUser(token);
  if (!me) {
    redirect(`/${locale}/entrar`);
  }

  redirect(`/${locale}/perfil/${me.id}`);
}
