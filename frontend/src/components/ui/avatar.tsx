import Image from "next/image";
import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClassMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const fallbackTextSizeClassMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const sizeClass = sizeClassMap[size];
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  const isRemoteSrc = typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"));

  if (src) {
    return (
      <span
        className={cn("relative inline-flex overflow-hidden rounded-[8px] border border-black/10 bg-black/5", sizeClass, className)}
      >
        <Image
          src={src}
          alt={name ?? "Avatar"}
          fill
          sizes={size === "lg" ? "56px" : size === "md" ? "40px" : "32px"}
          unoptimized={isRemoteSrc}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] border border-[rgba(126,34,206,0.35)] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-strong)_100%)] font-black text-white shadow-[0_12px_26px_-16px_rgba(109,40,217,0.95)]",
        fallbackTextSizeClassMap[size],
        sizeClass,
        className
      )}
    >
      {initial || <UserRound size={size === "lg" ? 18 : 14} />}
    </span>
  );
}
