import { AlertTriangle, ScrollText } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import type { NfceLogEntry } from "../../domain/nfce-history";
import { formatDate } from "../../domain/nfce-formatters";
import { SectionCard } from "./NfceDetailPrimitives";
import { logTypeLabel } from "./nfce-detail-labels";

/** Aba "Histórico", bloco "Logs de Processamento" — cópia fiel do legado. */
export function NfceLogsSection({ logs }: { logs: NfceLogEntry[] }) {
  return (
    <SectionCard icon={<ScrollText className="h-4 w-4 text-primary" />} title="Logs de Processamento" subtitle={logs.length > 0 ? `${logs.length} registro(s)` : undefined}>
      {logs.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Nenhum log encontrado</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isError = log.level === "ERROR";
            const isWarning = log.level === "WARNING";
            const borderColor = isError ? "border-l-red-500" : isWarning ? "border-l-amber-500" : "border-l-emerald-500";
            const levelIcon = isError ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            ) : isWarning ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            ) : null;

            return (
              <div key={log.id} className={`rounded-lg border border-border/40 border-l-2 ${borderColor} p-3 space-y-1.5 hover:bg-muted/20 transition-colors`}>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {levelIcon}
                  <span className="text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</span>
                  {log.type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{logTypeLabel(log.type)}</Badge>}
                  {log.userName && (
                    <span className="text-muted-foreground">
                      por <strong>{log.userName}</strong>
                    </span>
                  )}
                </div>
                <p className="text-sm">{log.message}</p>
                {(log.previousStatus || log.newStatus) && (
                  <p className="text-xs text-muted-foreground">
                    Status: <span className="font-mono">{log.previousStatus ?? "—"}</span> → <span className="font-mono">{log.newStatus ?? "—"}</span>
                  </p>
                )}
                {log.returnCode && (
                  <p className="text-xs">
                    Código retorno: <span className="font-mono">{log.returnCode}</span>
                  </p>
                )}
                {log.protocol && (
                  <p className="text-xs">
                    Protocolo: <span className="font-mono">{log.protocol}</span>
                  </p>
                )}
                {log.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Detalhes</summary>
                    <pre className="mt-1 whitespace-pre-wrap bg-muted/50 rounded-md p-2.5 text-[11px] max-h-40 overflow-auto font-mono">{log.details}</pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
