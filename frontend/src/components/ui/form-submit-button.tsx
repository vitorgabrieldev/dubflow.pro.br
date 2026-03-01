"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = Omit<ButtonProps, "type"> & {
  label: string;
  loadingLabel?: string;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  showPendingOnClick?: boolean;
  pendingFallbackMs?: number;
};

export function FormSubmitButton({
  label,
  loadingLabel,
  icon,
  trailingIcon,
  showPendingOnClick = false,
  pendingFallbackMs = 15000,
  disabled,
  onClick,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [clickedPending, setClickedPending] = useState(false);
  const isLoading = pending || (showPendingOnClick && clickedPending);
  const isDisabled = Boolean(disabled) || isLoading;

  useEffect(() => {
    if (!showPendingOnClick || !clickedPending) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setClickedPending(false);
    }, pendingFallbackMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [clickedPending, pendingFallbackMs, showPendingOnClick]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (!event.defaultPrevented && showPendingOnClick) {
      window.setTimeout(() => {
        setClickedPending(true);
      }, 0);
    }
  }

  return (
    <Button type="submit" disabled={isDisabled} aria-busy={isLoading} onClick={handleClick} {...props}>
      {isLoading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {isLoading ? (loadingLabel ?? label) : label}
      {isLoading ? null : trailingIcon}
    </Button>
  );
}
