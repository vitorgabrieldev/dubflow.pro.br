"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

type TagInputProps = {
  name: string;
  initialValues?: string[];
  placeholder?: string;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function TagInput({ name, initialValues = [], placeholder = "Digite e pressione Enter" }: TagInputProps) {
  const [values, setValues] = useState<string[]>(() => initialValues.map(normalize).filter(Boolean));
  const [input, setInput] = useState("");

  const serialized = useMemo(() => JSON.stringify(values), [values]);

  function addValue(raw: string) {
    const next = normalize(raw);
    if (!next) {
      return;
    }

    setValues((current) => {
      const exists = current.some((item) => item.toLowerCase() === next.toLowerCase());
      if (exists) {
        return current;
      }
      return [...current, next];
    });
  }

  function removeValue(value: string) {
    setValues((current) => current.filter((item) => item !== value));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addValue(input);
      setInput("");
      return;
    }

    if (event.key === "Backspace" && !input && values.length > 0) {
      setValues((current) => current.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={serialized} />

      <div className="flex min-h-10 w-full flex-wrap items-start gap-2 rounded-[8px] border border-[var(--color-border-soft)] bg-white px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-ink)]"
          >
            <span className="min-w-0 break-all whitespace-normal">{value}</span>
            <button
              type="button"
              onClick={() => removeValue(value)}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-black/55 transition hover:text-black"
              aria-label={`Remover ${value}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!input.trim()) {
              return;
            }
            addValue(input);
            setInput("");
          }}
          placeholder={placeholder}
          className="h-7 min-w-0 basis-32 flex-1 border-0 bg-transparent px-1 text-sm text-[var(--color-ink)] outline-none placeholder:text-black/45 sm:basis-44"
        />
      </div>
    </div>
  );
}
