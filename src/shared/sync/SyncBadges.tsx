"use client";

/**
 * Badges do `SyncEventsPanel` legado: `SyncOpBadge` (cópia fiel) e `SyncStatusBadge`
 * (o `statusBadge(status)` que o legado montava com `buildStatusBadge(successKey)`).
 * `SyncOpBadge` precisa de um `TooltipProvider` acima (o `SyncEventsPanel` fornece).
 */
import { Badge } from "@/shared/ui/primitives/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { cn } from "@/shared/ui/cn";
import { getSyncOpPresentation } from "./sync-op-label";
import { syncStatusBadgeStyle } from "./sync-events-format";

export function SyncOpBadge({ op, className }: { op: string; className?: string }) {
  const { short, tooltip } = getSyncOpPresentation(op);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-border/80 bg-muted/30 text-[10px] font-semibold w-6 h-6 shrink-0 cursor-default text-foreground",
            className,
          )}
        >
          {short}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function SyncStatusBadge({ status, successKey }: { status: string; successKey: string }) {
  const v = syncStatusBadgeStyle(successKey, status);
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}
