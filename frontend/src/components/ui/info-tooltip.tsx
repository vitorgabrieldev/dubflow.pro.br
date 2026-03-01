"use client";

import { CircleHelp } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  message: string;
  triggerClassName?: string;
};

export function InfoTooltip({ message, triggerClassName }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn("inline-flex cursor-help items-center text-black/50 transition hover:text-black/75", triggerClassName)}
            aria-label="Informação"
          >
            <CircleHelp size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
