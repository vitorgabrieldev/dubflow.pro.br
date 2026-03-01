import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogIn, Mail, ShieldCheck } from "lucide-react";

import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { DubbingShowcasePanel } from "@/components/auth/dubbing-showcase-panel";
import { PasswordInput } from "@/components/auth/password-input";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; from?: string; changed?: string; reset?: string }>;
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
  const panelClass = query.from === "signup" ? "auth-slide-in-left" : "auth-slide-in-left-soft";
  const cardClass = query.from === "signup" ? "auth-slide-in-right" : "auth-slide-in-right-soft";

  return (
    <div
      id="auth-transition-root"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1180px] items-center px-1 py-6 lg:grid lg:min-h-[calc(100vh-180px)] lg:grid-cols-2 lg:gap-6 lg:px-0 lg:py-0"
    >
      <DubbingShowcasePanel
        className={panelClass}
        badge="DubFlow"
        title="Conectando vozes e histórias."
        subtitle="Publique materiais longos, registre créditos por personagem e acompanhe a evolução do seu portfólio."
        bullets={["Feed contínuo com rolagem", "Créditos completos por fala", "Colaboração entre dubladores"]}
      />

      <Card
        className={`w-full border-0 bg-transparent shadow-none lg:min-h-[600px] lg:border lg:border-[var(--color-border-soft)] lg:bg-white/94 lg:shadow-[0_18px_46px_-34px_rgba(76,16,140,0.45)] ${cardClass}`}
      >
        <CardBody className="mx-auto flex h-full w-full max-w-[100%] flex-col justify-center gap-7 py-4 text-left lg:p-8">
          <div className="w-full space-y-8">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Acesso</p>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-[var(--color-ink)]">
                <LogIn size={20} />
                {t.auth.login}
              </h2>
              <p className="text-sm text-black/65">Onde seu portfólio de dublagens ganha voz.</p>
            </div>

            {query.error ? (
              <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Credenciais inválidas. Tente novamente.
              </p>
            ) : null}
            {query.changed === "1" || query.reset === "1" ? (
              <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Senha atualizada com sucesso. Faça login novamente.
              </p>
            ) : null}

            <form action="/api/auth/login" method="post" className="w-full space-y-7 text-left">
              <input type="hidden" name="locale" value={locale} />

              <div className="space-y-10">
                <label className="space-y-1.5 text-sm font-semibold text-black/80">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Mail size={14} />
                    E-mail
                  </span>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="E-mail"
                    className="h-11 border-0 mb-[20px] bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-black/80">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <ShieldCheck size={14} />
                    Senha
                  </span>
                  <PasswordInput
                    name="password"
                    required
                    placeholder="Senha"
                    className="h-11 border-0 bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
                  />
                </label>
              </div>

              <FormSubmitButton
                className="h-11 w-full rounded-[6px]"
                label={t.auth.login}
                loadingLabel="Entrando..."
                trailingIcon={<ArrowRight size={15} />}
              />

              <div className="text-center">
                <Link href={`/${locale}/recuperar-senha`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                  Esqueci minha senha
                </Link>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  <span className="h-px flex-1 bg-black/15" />
                  OU
                  <span className="h-px flex-1 bg-black/15" />
                </div>

                <p className="text-sm text-black/70 text-center">
                  Crie sua conta gratuitamente.{" "}
                  <AuthSwitchLink href={`/${locale}/criar-conta?from=login`} direction="left">
                    {t.auth.signup}
                  </AuthSwitchLink>
                </p>
              </div>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
