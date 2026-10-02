"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import type { SyncLogEntry } from "../domain/dashboard-snapshot";
import { formatDateTime } from "@/shared/format/date-time";

/** "Últimos Erros de Sincronização" — só existe na loja (`backend === "lan"`). */
export function RecentSyncErrorsPanel({ errors }: { errors: SyncLogEntry[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Últimos Erros de Sincronização
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum erro recente.</p>
        ) : (
          <div className="space-y-2">
            {errors.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <StatusBadge status={log.direction} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-destructive truncate">{log.errorMessage}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.tableName} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
