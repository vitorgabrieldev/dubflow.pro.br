"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthSwitchLinkProps = {
  href: string;
  className?: string;
  direction: "left" | "right";
  children: ReactNode;
};

export function AuthSwitchLink({ href, className, direction, children }: AuthSwitchLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    const root = document.getElementById("auth-transition-root");
    if (root) {
      root.classList.remove("auth-exit-left", "auth-exit-right");
      root.classList.add(direction === "left" ? "auth-exit-left" : "auth-exit-right");
    }

    window.setTimeout(() => {
      router.push(href);
    }, 170);
  }

  return (
    <Link href={href} onClick={handleClick} className={cn("font-semibold text-[var(--color-primary)]", className)}>
      {children}
    </Link>
  );
}
