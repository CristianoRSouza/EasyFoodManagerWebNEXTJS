"use client";

import type { ReactNode } from "react";
import { Monitor, Pencil, PlusCircle, Server, ToggleRight } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { formatAuditDateTime, formatAuditValue } from "@/shared/audit/audit-log";
import { AUDIT_FIELD_LABELS, type AuditAction, type AuditSource, type UnifiedAuditLog } from "../domain/unified-audit-log";

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: typeof PlusCircle; variant: "default" | "secondary" | "outline" }> = {
  created: { label: "Criado", icon: PlusCircle, variant: "default" },
  updated: { label: "Editado", icon: Pencil, variant: "secondary" },
  toggled: { label: "Status alterado", icon: ToggleRight, variant: "outline" },
};

const SOURCE_CONFIG: Record<AuditSource, { label: string; icon: typeof Monitor; color: string }> = {
  totem: { label: "Totem", icon: Monitor, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  agent: { label: "Agente", icon: Server, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

/** Um item da linha do tempo de `LEGACY/src/pages/AuditLogsPage.tsx` (JSX e classes copiados). */
export function AuditLogTimelineEntry({ log }: { log: UnifiedAuditLog }): ReactNode {
  const config = ACTION_CONFIG[log.action];
  const srcConfig = SOURCE_CONFIG[log.source];
  const Icon = config.icon;
  const SrcIcon = srcConfig.icon;

  return (
    <div className="relative pb-5 sm:pb-6 last:pb-0">
      <div className="absolute -left-5 sm:-left-6 top-1 flex items-center justify-center w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full bg-background border-2 border-border">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 gap-y-1 flex-wrap">
          <Badge className={`text-[10px] border ${srcConfig.color}`}>
            <SrcIcon className="h-3 w-3 mr-1" />
            {srcConfig.label}
          </Badge>
          <Badge variant={config.variant} className="text-[10px]">
            {config.label}
          </Badge>
          {log.entity_name && (
            <span className="text-[11px] sm:text-xs font-medium text-foreground">
              {log.entity_name}
            </span>
          )}
          <span className="text-[11px] sm:text-xs text-muted-foreground">
            {formatAuditDateTime(log.created_at)}
          </span>
          <span className="text-[11px] sm:text-xs text-muted-foreground break-all">
            por <span className="font-medium text-foreground">{log.performed_by}</span>
          </span>
        </div>

        {log.changed_fields.length > 0 && (
          <div className="bg-muted/50 rounded-md p-2.5 sm:p-3 space-y-2 text-xs">
            {log.changed_fields.map((field) => {
              const label = AUDIT_FIELD_LABELS[field] ?? field;
              const prev = log.previous_values[field];
              const next = log.new_values[field];
              return (
                <div key={field} className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-1.5">
                  <span className="font-medium text-muted-foreground sm:min-w-[160px] shrink-0">{label}:</span>
                  {log.action === "created" ? (
                    <span className="text-foreground break-all">{formatAuditValue(next)}</span>
                  ) : (
                    <span className="break-all">
                      <span className="text-destructive line-through">{formatAuditValue(prev)}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="text-primary font-medium">{formatAuditValue(next)}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
