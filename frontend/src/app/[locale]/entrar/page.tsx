import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { PasswordInput } from "@/components/auth/password-input";
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
  const cardClass = query.from === "signup" ? "auth-slide-in-right" : "auth-slide-in-right-soft";

  return (
    <div
      id="auth-transition-root"
      className="flex h-[100dvh] items-center justify-center overflow-hidden px-3 py-3 sm:px-6 sm:py-4"
    >
      <section
        className={`max-h-[calc(100dvh-24px)] w-full max-w-[460px] overflow-y-auto overscroll-contain rounded-[22px] border border-white/75 bg-white/90 p-4 shadow-[0_26px_80px_-44px_rgba(76,16,140,0.52)] backdrop-blur-xl sm:max-h-none sm:overflow-visible sm:rounded-[28px] sm:p-7 ${cardClass}`}
      >
        <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#f3edff_0%,#ebe2ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:h-[60px] sm:w-[60px] sm:rounded-[18px]">
          <div className="grid grid-cols-3 gap-[3px] sm:gap-1">
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-75 sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-70 sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-85 sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-85 sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-65 sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] opacity-[0.08] sm:h-[6px] sm:w-[6px]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-primary)] sm:h-[6px] sm:w-[6px]" />
          </div>
        </div>

        <div className="mt-5 space-y-2 text-center sm:mt-6">
          <h1 className="text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[2rem]">
            Bem-vindo de volta
          </h1>
          <p className="text-[13px] leading-5 text-black/58 sm:text-sm sm:leading-6">
            Entre para publicar seus projetos, manter os cr&eacute;ditos em ordem e acompanhar sua evolu&ccedil;&atilde;o com clareza.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-full bg-[rgba(120,85,180,0.08)] p-[3px] sm:mt-6 sm:p-1">
          <span className="flex h-10 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[var(--color-ink)] shadow-[0_8px_18px_-16px_rgba(76,16,140,0.42)] sm:h-11 sm:text-sm">
            {t.auth.login}
          </span>
          <AuthSwitchLink
            href={`/${locale}/criar-conta?from=login`}
            direction="left"
            className="flex h-10 items-center justify-center rounded-full text-[13px] font-medium text-black/48 transition hover:text-[var(--color-ink)] sm:h-11 sm:text-sm"
          >
            {t.auth.signup}
          </AuthSwitchLink>
        </div>

        <div className="mt-4 space-y-3 sm:mt-5">
          {query.error ? (
            <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:rounded-[14px]">
              Credenciais inv&aacute;lidas. Tente novamente.
            </p>
          ) : null}

          {query.changed === "1" || query.reset === "1" ? (
            <p className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:rounded-[14px]">
              Senha atualizada com sucesso. Faça login novamente.
            </p>
          ) : null}
        </div>

        <form action="/api/auth/login" method="post" className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          <input type="hidden" name="locale" value={locale} />

          <label className="block space-y-3 sm:space-y-4">
            <span className="ml-3 text-sm font-medium text-black/72 sm:ml-[15px]">E-mail</span>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/42" />
              <Input
                name="email"
                type="email"
                required
                placeholder="Preencha seu e-mail"
                className="h-[50px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)] sm:h-[52px]"
              />
            </div>
          </label>

          <label className="block space-y-3 sm:space-y-4">
            <span className="ml-3 text-sm font-medium text-black/72 sm:ml-[15px]">Senha</span>
            <div className="relative">
              <ShieldCheck
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-black/42"
              />
              <PasswordInput
                name="password"
                required
                placeholder="Preencha sua senha"
                className="h-[50px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)] sm:h-[52px]"
              />
            </div>
          </label>

          <FormSubmitButton
            className="h-10 w-full rounded-[10px] border-b-[4px] border-[var(--color-primary-strong)] bg-[var(--color-primary)] px-4 text-[14px] font-extrabold text-white shadow-[0_10px_22px_-14px_rgba(126,34,206,0.95)] transition-[transform,filter,box-shadow] duration-150 hover:brightness-105 active:translate-y-[2px] active:border-b-[2px] active:shadow-[0_6px_14px_-12px_rgba(126,34,206,0.95)] sm:h-11 sm:text-[15px]"
            label={t.auth.login}
            loadingLabel="Entrando..."
            trailingIcon={<ArrowRight size={16} />}
            showPendingOnClick
          />
        </form>
      </section>
    </div>
  );
}
