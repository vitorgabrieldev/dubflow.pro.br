import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { isLocale } from "@/lib/i18n";

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string; debug_token?: string; debug_email?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--color-ink)]">
            <KeyRound size={18} />
            Recuperar senha
          </p>

          <p className="text-sm text-black/70">
            Informe seu e-mail para gerar o link de recuperação.
          </p>

          {query.sent === "1" ? (
            <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Se o e-mail existir, enviamos instruções de recuperação.
            </p>
          ) : null}

          {query.error === "1" ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Não foi possível iniciar a recuperação agora.
            </p>
          ) : null}

          <form action="/api/auth/forgot-password" method="post" className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="space-y-1 text-sm text-black/75">
              <span className="inline-flex items-center gap-1">
                <Mail size={14} />
                E-mail
              </span>
              <Input name="email" type="email" required placeholder="Digite seu e-mail" />
            </label>
            <FormSubmitButton className="h-10 w-full" label="Enviar recuperação" loadingLabel="Enviando..." />
          </form>

          {query.debug_token && query.debug_email ? (
            <Link
              href={`/${locale}/redefinir-senha?token=${encodeURIComponent(query.debug_token)}&email=${encodeURIComponent(query.debug_email)}`}
              className="inline-flex text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Ambiente local: abrir redefinição direto
            </Link>
          ) : null}

          <Link href={`/${locale}/entrar`} className="inline-flex text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Voltar para login
          </Link>
        </CardBody>
      </Card>
    </section>
  );
}

