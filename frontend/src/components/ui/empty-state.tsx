import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardBody } from "@/components/ui/card";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  inline?: boolean;
};

export function EmptyState({
  title = "Não há nada aqui por enquanto : /",
  description,
  icon,
  inline = false,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {icon ?? <Inbox size={20} />}
      </span>
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      {description ? <p className="max-w-md text-sm text-black/60">{description}</p> : null}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Card>
      <CardBody className="p-4">{content}</CardBody>
    </Card>
  );
}
