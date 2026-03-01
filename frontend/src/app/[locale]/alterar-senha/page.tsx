import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { PasswordInput } from "@/components/auth/password-input";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { isLocale } from "@/lib/i18n";

export default async function ChangePasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; password_error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ed_token")?.value;

  if (!token) {
    redirect(`/${locale}/entrar`);
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-ink)]">
            <KeyRound size={18} />
            Alterar senha
          </p>

          {query.error === "1" || query.password_error === "1" ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível alterar a senha. Verifique os campos e tente novamente.
            </p>
          ) : null}

          <form action="/api/auth/change-password" method="post" className="space-y-3">
            <input type="hidden" name="locale" value={locale} />

            <label className="space-y-1 text-sm text-black/75">
              <span>Senha atual</span>
              <PasswordInput name="current_password" required placeholder="Digite sua senha atual" className="mb-2" />
            </label>

            <label className="space-y-1 text-sm text-black/75">
              <span>Nova senha</span>
              <PasswordInput name="password" minLength={8} required placeholder="Digite a nova senha" className="mb-2" />
            </label>

            <label className="space-y-1 text-sm text-black/75">
              <span>Confirmar nova senha</span>
              <PasswordInput
                name="password_confirmation"
                minLength={8}
                required
                placeholder="Confirme a nova senha"
                className="mb-2"
              />
            </label>

            <FormSubmitButton className="h-10 w-full" label="Atualizar senha" loadingLabel="Atualizando senha..." />
          </form>

          <div className="rounded-[8px] border border-black/10 bg-black/[0.03] p-3 text-sm text-black/70">
            <p className="inline-flex items-center gap-2">
              <LockKeyhole size={14} />
              Ao alterar a senha, todos os aparelhos conectados serão desconectados.
            </p>
            <p className="mt-1 inline-flex items-center gap-2">
              <ShieldCheck size={14} />
              Use ao menos 8 caracteres com letras e números.
            </p>
          </div>

          <Link href={`/${locale}/perfil`} className="inline-flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-[var(--color-ink)]">
            Voltar ao perfil
          </Link>
        </CardBody>
      </Card>
    </section>
  );
}
