import { Shield } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import type { NfceEvent } from "../../domain/nfce-history";
import { formatDate } from "../../domain/nfce-formatters";
import { SectionCard } from "./NfceDetailPrimitives";
import { eventTypeLabel, situationBadgeClass } from "./nfce-detail-labels";

/** Aba "Histórico", bloco "Eventos SEFAZ" — só aparece quando há eventos (cópia fiel do legado). */
export function NfceEventsSection({ events }: { events: NfceEvent[] }) {
  if (events.length === 0) return null;

  return (
    <SectionCard icon={<Shield className="h-4 w-4 text-primary" />} title="Eventos SEFAZ" subtitle={`${events.length} evento(s)`}>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-lg border border-border/50 p-3 space-y-1.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(event.eventAt)}</span>
              <Badge className={`${situationBadgeClass(event.situation)} text-xs`}>{event.situation ?? "—"}</Badge>
              <span className="font-medium text-sm">{eventTypeLabel(event.eventType)}</span>
              {event.description && <span className="text-xs text-muted-foreground">— {event.description}</span>}
            </div>
            {event.protocol && (
              <p className="text-xs">
                Protocolo: <span className="font-mono">{event.protocol}</span>
              </p>
            )}
            {event.sefazStatusCode && (
              <p className="text-xs">
                SEFAZ: {event.sefazStatusCode} — {event.sefazStatusReason}
              </p>
            )}
            {event.justification && <p className="text-xs text-muted-foreground">Justificativa: {event.justification}</p>}
            {event.correction && <p className="text-xs text-muted-foreground">Correção: {event.correction}</p>}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
