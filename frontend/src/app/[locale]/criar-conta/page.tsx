import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck, UserPlus, UserRound, WandSparkles } from "lucide-react";

import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { DubbingShowcasePanel } from "@/components/auth/dubbing-showcase-panel";
import { LegalInline } from "@/components/auth/legal-inline";
import { PasswordInput } from "@/components/auth/password-input";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
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
  const panelClass = query.from === "login" ? "auth-slide-in-right" : "auth-slide-in-right-soft";

  return (
    <div
      id="auth-transition-root"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1180px] items-center px-1 py-6 lg:grid lg:min-h-[calc(100vh-180px)] lg:grid-cols-2 lg:gap-6 lg:px-0 lg:py-0"
    >
      <Card
        className={`w-full border-0 bg-transparent shadow-none lg:min-h-[600px] lg:border lg:border-[var(--color-border-soft)] lg:bg-white/94 lg:shadow-[0_18px_46px_-34px_rgba(76,16,140,0.45)] ${cardClass}`}
      >
        <CardBody className="mx-auto flex h-full w-full max-w-[100%] flex-col justify-center gap-7 py-4 text-left lg:p-8">
          <div className="space-y-7">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Cadastro</p>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-[var(--color-ink)]">
              <UserPlus size={20} />
              {t.auth.signup}
            </h1>
            <p className="text-sm text-black/65">Crie sua conta para montar seu portfólio de dublagens.</p>
          </div>

          {query.error ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível criar a conta. Verifique os dados e aceite os termos.
            </p>
          ) : null}

          <form action="/api/auth/register" method="post" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />

            <label className="space-y-1.5 text-sm text-black/80 sm:col-span-2">
              <span className="inline-flex items-center gap-1">
                <UserRound size={14} />
                Nome
              </span>
              <Input
                name="name"
                required
                placeholder="Nome"
                className="h-11 border-0 bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
              />
            </label>

            <label className="space-y-1.5 text-sm text-black/80 sm:col-span-2">
              <span className="inline-flex items-center gap-1">
                <Mail size={14} />
                E-mail
              </span>
              <Input
                name="email"
                type="email"
                required
                placeholder="E-mail"
                className="h-11 border-0 bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
              />
            </label>

            <label className="space-y-1.5 text-sm text-black/80">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={14} />
                Senha
              </span>
              <PasswordInput
                name="password"
                minLength={8}
                required
                placeholder="Senha"
                className="h-11 border-0 bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
              />
            </label>

            <label className="space-y-1.5 text-sm text-black/80">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={14} />
                Confirmar senha
              </span>
              <PasswordInput
                name="password_confirmation"
                minLength={8}
                required
                placeholder="Confirmar senha"
                className="h-11 border-0 bg-white px-3 shadow-none sm:h-10 sm:border sm:border-[var(--color-border-soft)] sm:shadow-sm"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="flex items-start gap-2 rounded-[6px] px-3 py-3 text-sm text-black/75">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  value="1"
                  required
                  className="mt-0.5 h-4 w-4 rounded-[6px] border-black/20 accent-[var(--color-primary)]"
                />
                <span>
                  Li e aceito os <LegalInline />.
                </span>
              </span>
            </label>

            <div className="sm:col-span-2">
              <FormSubmitButton
                className="h-11 w-full rounded-[6px]"
                label="Criar conta"
                loadingLabel="Criando conta..."
                icon={<WandSparkles size={15} />}
                showPendingOnClick
              />
            </div>
          </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
              <span className="h-px flex-1 bg-black/15" />
              OU
              <span className="h-px flex-1 bg-black/15" />
            </div>

            <p className="text-sm text-black/70 text-center">
              Já tem conta?{" "}
              <AuthSwitchLink href={`/${locale}/entrar?from=signup`} direction="right">
                {t.auth.login}
              </AuthSwitchLink>
            </p>
          </div>
        </CardBody>
      </Card>

      <DubbingShowcasePanel
        className={panelClass}
        badge="Conta nova"
        title="Centralize seu trabalho de dublagem em um só lugar."
        subtitle="Crie comunidades, publique episódios completos e mantenha os créditos de todos os colaboradores organizados."
        bullets={["Portfólio por comunidade", "Timeline contínua", "Créditos detalhados por personagem"]}
      />
    </div>
  );
}
