import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-strong)_100%)] text-white shadow-[0_10px_26px_-14px_rgba(147,51,234,0.8)] hover:opacity-95 focus-visible:ring-[var(--color-primary)]",
        neutral:
          "bg-white text-[var(--color-ink)] ring-1 ring-[var(--color-border-soft)] hover:bg-[var(--color-primary-soft)] focus-visible:ring-[var(--color-primary)]",
        soft: "bg-[var(--color-primary-soft)] text-[var(--color-ink)] ring-1 ring-[var(--color-border-soft)] hover:bg-[#eadcff] focus-visible:ring-[var(--color-primary)]",
      },
      size: {
        md: "h-10",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
