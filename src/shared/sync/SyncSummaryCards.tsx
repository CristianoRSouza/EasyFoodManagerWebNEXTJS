"use client";

/** KPIs do topo do `SyncEventsPanel` legado (JSX/classes/textos idênticos). */
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { AlertTriangle, Clock, CheckCircle2, Inbox, Activity } from "lucide-react";
import type { PanelSummary } from "./sync-events-types";

export function SyncSummaryCards({
  summary,
  successLabel,
  rateLabel,
  rateTotal,
}: {
  summary: PanelSummary;
  successLabel: string;
  rateLabel: string;
  rateTotal: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <Card className="glass-panel">
        <CardContent className="pt-4 pb-3 text-center">
          <Inbox className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl sm:text-2xl font-bold">{summary.pending_novos}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Pendentes novos</p>
        </CardContent>
      </Card>
      <Card className="glass-panel">
        <CardContent className="pt-4 pb-3 text-center">
          <Clock className="h-4 w-4 mx-auto mb-1 text-warning" />
          <p className="text-xl sm:text-2xl font-bold text-warning">{summary.pending_em_retry}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Em retry</p>
        </CardContent>
      </Card>
      <Card className="glass-panel">
        <CardContent className="pt-4 pb-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
          <p className="text-xl sm:text-2xl font-bold text-success">{summary.success_total}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{successLabel}</p>
        </CardContent>
      </Card>
      <Card className="glass-panel">
        <CardContent className="pt-4 pb-3 text-center">
          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-destructive" />
          <p className="text-xl sm:text-2xl font-bold text-destructive">{summary.failed_terminal}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Falhas terminais</p>
        </CardContent>
      </Card>
      <Card className="glass-panel col-span-2 sm:col-span-1">
        <CardContent className="pt-4 pb-3 text-center">
          <Activity className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-xl sm:text-2xl font-bold">{rateTotal}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{rateLabel}</p>
        </CardContent>
      </Card>
    </div>
  );
}
