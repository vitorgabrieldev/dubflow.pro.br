import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("skeleton-shimmer block rounded-[6px]", className)} {...props} />;
}
