import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SignupFlowCard } from "@/components/auth/signup-flow-card";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    redirect("/pt-BR");
  }

  const t = getDictionary(locale);
  const cookieStore = await cookies();

  if (cookieStore.get("ed_token")?.value) {
    redirect(`/${locale}`);
  }

  const query = await searchParams;
  const cardClass = query.from === "login" ? "auth-slide-in-left" : "auth-slide-in-left-soft";

  return (
    <SignupFlowCard
      locale={locale}
      loginLabel={t.auth.login}
      signupLabel={t.auth.signup}
      showError={Boolean(query.error)}
      cardClass={cardClass}
    />
  );
}
