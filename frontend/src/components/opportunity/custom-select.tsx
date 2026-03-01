"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CustomSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function CustomSelect({ value, options, onChange, placeholder, disabled }: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-[9px] border border-[var(--color-border-soft)] bg-white px-3 text-left text-sm text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]",
          disabled ? "cursor-not-allowed opacity-60" : undefined
        )}
      >
        <span className="line-clamp-1">{selected?.label ?? placeholder ?? "Selecione"}</span>
        <ChevronDown size={15} className={cn("transition", open ? "rotate-180" : undefined)} />
      </button>

      <div
        className={cn(
          "absolute z-40 mt-1.5 max-h-64 w-full overflow-auto rounded-[10px] border border-[var(--color-border-soft)] bg-white p-1.5 shadow-xl transition duration-150 ease-out origin-top",
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-1 scale-95 opacity-0 pointer-events-none"
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-start justify-between gap-2 rounded-[8px] px-3 py-2 text-left transition",
                isSelected
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-ink)]"
                  : "text-black/75 hover:bg-black/5"
              )}
            >
              <span className="min-w-0">
                <span className="block line-clamp-1 text-sm font-semibold">{option.label}</span>
                {option.hint ? <span className="block text-xs text-black/55">{option.hint}</span> : null}
              </span>

              {isSelected ? <Check size={14} className="mt-0.5 shrink-0 text-[var(--color-primary)]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
