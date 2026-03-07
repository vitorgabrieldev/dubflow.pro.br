"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";

import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { LegalInline } from "@/components/auth/legal-inline";
import { PasswordInput } from "@/components/auth/password-input";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";

type SignupFlowCardProps = {
  locale: string;
  loginLabel: string;
  signupLabel: string;
  showError: boolean;
  cardClass: string;
};

type SignupDraft = {
  name: string;
  stage_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
  privacy_accepted: boolean;
};

const SIGNUP_DRAFT_KEY = "dubflow-signup-draft";

const EMPTY_DRAFT: SignupDraft = {
  name: "",
  stage_name: "",
  email: "",
  password: "",
  password_confirmation: "",
  terms_accepted: false,
  privacy_accepted: false,
};

export function SignupFlowCard({
  locale,
  loginLabel,
  signupLabel,
  showError,
  cardClass,
}: SignupFlowCardProps) {
  const [step, setStep] = useState<1 | 2>(showError ? 2 : 1);
  const [draft, setDraft] = useState<SignupDraft>(EMPTY_DRAFT);
  const [stepError, setStepError] = useState<string | null>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(!showError);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (!showError) {
      return;
    }

    try {
      const storedDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_KEY);
      if (!storedDraft) {
        return;
      }

      const parsed = JSON.parse(storedDraft) as Partial<SignupDraft>;
      setDraft({
        ...EMPTY_DRAFT,
        ...parsed,
        terms_accepted: parsed.terms_accepted === true,
        privacy_accepted: parsed.privacy_accepted === true,
      });
    } catch {
      setDraft(EMPTY_DRAFT);
    } finally {
      setHasLoadedDraft(true);
    }
  }, [showError]);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    window.sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hasLoadedDraft]);

  function updateDraft<K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setStepError(null);
  }

  function handleContinue() {
    if (!draft.name.trim() || !draft.stage_name.trim() || !draft.terms_accepted || !draft.privacy_accepted) {
      setStepError("Preencha nome completo, nome artístico e aceite os termos e a política para continuar.");
      setIsContinuing(false);
      return;
    }

    setIsContinuing(true);
    setStepError(null);
    window.setTimeout(() => {
      setStep(2);
      setIsContinuing(false);
    }, 220);
  }

  return (
    <div
      id="auth-transition-root"
      className="flex h-[100dvh] items-center justify-center overflow-hidden px-4 py-4 sm:px-6"
    >
      <section
        className={`w-full max-w-[460px] rounded-[28px] border border-white/75 bg-white/90 p-5 shadow-[0_26px_80px_-44px_rgba(76,16,140,0.52)] backdrop-blur-xl sm:p-7 ${cardClass}`}
      >
        <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#f3edff_0%,#ebe2ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <div className="grid grid-cols-3 gap-1">
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-75" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)]" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-70" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-85" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)]" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-85" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-65" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)] opacity-[0.08]" />
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--color-primary)]" />
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
            Criar sua conta
          </h1>
          <p className="text-sm leading-6 text-black/58">
            Monte seu espa&ccedil;o no DubFlow para publicar projetos, organizar cr&eacute;ditos e evoluir com consist&ecirc;ncia.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-[rgba(120,85,180,0.08)] p-1">
          <AuthSwitchLink
            href={`/${locale}/entrar?from=signup`}
            direction="right"
            className="flex h-11 items-center justify-center rounded-full text-sm font-medium text-black/48 transition hover:text-[var(--color-ink)]"
          >
            {loginLabel}
          </AuthSwitchLink>
          <span className="flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--color-ink)] shadow-[0_8px_18px_-16px_rgba(76,16,140,0.42)]">
            {signupLabel}
          </span>
        </div>

        <form action="/api/auth/register" method="post" className="mt-5 space-y-4">
          <input type="hidden" name="locale" value={locale} />

          {step === 1 ? (
            <>
              <label className="block space-y-4">
                <span className="ml-[15px] text-sm font-medium text-black/72">Nome completo</span>
                <div className="relative">
                  <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/42" />
                  <Input
                    name="name"
                    required
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    placeholder="Preencha seu nome completo"
                    className="h-[52px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              </label>

              <label className="block space-y-4">
                <span className="ml-[15px] text-sm font-medium text-black/72">Nome artístico</span>
                <div className="relative">
                  <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/42" />
                  <Input
                    name="stage_name"
                    required
                    value={draft.stage_name}
                    onChange={(event) => updateDraft("stage_name", event.target.value)}
                    placeholder="Preencha seu nome artístico"
                    className="h-[52px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              </label>

              <div className="space-y-3 rounded-[14px] border border-black/8 bg-black/[0.02] px-4 py-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="terms_accepted"
                    value="1"
                    checked={draft.terms_accepted}
                    onChange={(event) => updateDraft("terms_accepted", event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-[4px] border-black/20 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm leading-6 text-black/65">
                    Eu li e aceito os <LegalInline mode="terms" />.
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="privacy_accepted"
                    value="1"
                    checked={draft.privacy_accepted}
                    onChange={(event) => updateDraft("privacy_accepted", event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-[4px] border-black/20 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm leading-6 text-black/65">
                    Eu li e aceito a <LegalInline mode="privacy" />.
                  </span>
                </label>
              </div>

              {stepError ? (
                <p className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {stepError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={isContinuing}
                onClick={handleContinue}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-b-[4px] border-[var(--color-primary-strong)] bg-[var(--color-primary)] px-4 text-[15px] font-extrabold text-white shadow-[0_10px_22px_-14px_rgba(126,34,206,0.95)] transition-[transform,filter,box-shadow] duration-150 hover:brightness-105 active:translate-y-[2px] active:border-b-[2px] active:shadow-[0_6px_14px_-12px_rgba(126,34,206,0.95)] disabled:cursor-default disabled:opacity-95"
              >
                {isContinuing ? (
                  <>
                    Continuando
                    <Loader2 size={15} className="animate-spin" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <input type="hidden" name="name" value={draft.name} />
              <input type="hidden" name="stage_name" value={draft.stage_name} />
              {draft.terms_accepted ? <input type="hidden" name="terms_accepted" value="1" /> : null}
              {draft.privacy_accepted ? <input type="hidden" name="privacy_accepted" value="1" /> : null}

              <div className="flex items-center justify-between rounded-[14px] border border-black/8 bg-black/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--color-ink)]">{draft.name}</p>
                  <p className="line-clamp-1 text-xs text-black/55">{draft.stage_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
              </div>

              {showError ? (
                <p className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  N&atilde;o foi poss&iacute;vel criar a conta. Revise os dados e tente novamente.
                </p>
              ) : null}

              <label className="block space-y-4">
                <span className="ml-[15px] text-sm font-medium text-black/72">E-mail</span>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/42" />
                  <Input
                    name="email"
                    type="email"
                    required
                    value={draft.email}
                    onChange={(event) => updateDraft("email", event.target.value)}
                    placeholder="Preencha seu e-mail"
                    className="h-[52px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              </label>

              <label className="block space-y-4">
                <span className="ml-[15px] text-sm font-medium text-black/72">Senha</span>
                <div className="relative">
                  <ShieldCheck
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-black/42"
                  />
                  <PasswordInput
                    name="password"
                    minLength={8}
                    required
                    value={draft.password}
                    onChange={(event) => updateDraft("password", event.target.value)}
                    placeholder="Preencha sua senha"
                    className="h-[52px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              </label>

              <label className="block space-y-4">
                <span className="ml-[15px] text-sm font-medium text-black/72">Repetir senha</span>
                <div className="relative">
                  <ShieldCheck
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-black/42"
                  />
                  <PasswordInput
                    name="password_confirmation"
                    minLength={8}
                    required
                    value={draft.password_confirmation}
                    onChange={(event) => updateDraft("password_confirmation", event.target.value)}
                    placeholder="Repita sua senha"
                    className="h-[52px] rounded-[10px] border-black/10 bg-white px-11 tracking-[0.02em] shadow-none focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              </label>

              <FormSubmitButton
                className="h-11 w-full rounded-[10px] border-b-[4px] border-[var(--color-primary-strong)] bg-[var(--color-primary)] px-4 text-[15px] font-extrabold text-white shadow-[0_10px_22px_-14px_rgba(126,34,206,0.95)] transition-[transform,filter,box-shadow] duration-150 hover:brightness-105 active:translate-y-[2px] active:border-b-[2px] active:shadow-[0_6px_14px_-12px_rgba(126,34,206,0.95)]"
                label={signupLabel}
                loadingLabel="Criando conta..."
                trailingIcon={<ArrowRight size={16} />}
                showPendingOnClick
              />
            </>
          )}
        </form>
      </section>
    </div>
  );
}
