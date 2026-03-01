import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";

import { PasswordInput } from "@/components/auth/password-input";
import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { isLocale } from "@/lib/i18n";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const token = query.token?.trim() ?? "";
  const email = query.email?.trim() ?? "";

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-ink)]">
            <KeyRound size={18} />
            Redefinir senha
          </p>

          {!token || !email ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Link inválido de recuperação.
            </p>
          ) : null}

          {query.error === "1" ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível redefinir a senha com os dados informados.
            </p>
          ) : null}

          <form action="/api/auth/reset-password" method="post" className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />

            <label className="space-y-1 text-sm text-black/75">
              <span>E-mail</span>
              <Input name="email" type="email" required defaultValue={email} />
            </label>

            <label className="space-y-1 text-sm text-black/75">
              <span>Nova senha</span>
              <PasswordInput name="password" minLength={8} required />
            </label>

            <label className="space-y-1 text-sm text-black/75">
              <span>Confirmar nova senha</span>
              <PasswordInput name="password_confirmation" minLength={8} required />
            </label>

            <FormSubmitButton
              className="h-10 w-full"
              label="Redefinir senha"
              loadingLabel="Redefinindo senha..."
              disabled={!token || !email}
            />
          </form>

          <Link href={`/${locale}/entrar`} className="inline-flex text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Voltar para login
          </Link>
        </CardBody>
      </Card>
    </section>
  );
}

