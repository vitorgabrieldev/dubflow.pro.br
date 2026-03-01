import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-black/55">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="rounded-[6px] px-1 py-0.5 hover:bg-black/5 hover:text-[var(--color-ink)]">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-semibold text-[var(--color-ink)]" : ""}>{item.label}</span>
              )}

              {!isLast ? <ChevronRight size={12} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
