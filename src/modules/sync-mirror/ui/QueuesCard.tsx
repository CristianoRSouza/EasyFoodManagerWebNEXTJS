import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { MirrorQueues } from "../domain/sync-mirror";
import { formatCount, formatDayTime, formatRelative } from "../domain/mirror-format";
import { Tag } from "./mirror-ui";

/**
 * Filas PG ▸ FB — a única parte do espelho que olha PARA A FRENTE: item do totem que não entrou
 * no PDV, estorno por ecoar e comanda PAGA que ainda não virou venda. Porta de
 * `LEGACY/src/components/sync-mirror/QueuesCard.tsx`.
 */
export function QueuesCard({ queues, compact = false }: { queues: MirrorQueues | null; compact?: boolean }) {
  if (!queues) return null;

  const items = queues.items?.total ?? 0;
  const reversals = queues.reversals?.total ?? 0;
  const closings = queues.closings?.total ?? 0;
  const stuck = queues.closings?.stuck ?? 0;
  const failed = queues.closings?.failed ?? 0;
  const allEmpty = items === 0 && reversals === 0 && closings === 0;

  const lines = [
    {
      label: "Itens do totem a inserir",
      value: items,
      since: queues.items?.oldest ?? null,
      extra: queues.items?.orders ? `${formatCount(queues.items.orders)} comanda(s)` : null,
      tone: items > 0 ? ("atencao" as const) : ("neutro" as const),
    },
    {
      label: "Estornos a ecoar",
      value: reversals,
      since: queues.reversals?.oldest ?? null,
      extra: null,
      tone: reversals > 0 ? ("atencao" as const) : ("neutro" as const),
    },
    {
      label: "Comandas pagas a virar venda",
      value: closings,
      since: queues.closings?.oldest ?? null,
      extra: failed > 0 ? `${formatCount(failed)} com falha` : null,
      tone: stuck > 0 ? ("falha" as const) : closings > 0 ? ("atencao" as const) : ("neutro" as const),
    },
  ];

  const body = (
    <div className="space-y-2">
      {allEmpty ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          Nada esperando para entrar no Firebird.
        </p>
      ) : (
        lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {l.label}
              {l.extra && <span className="ml-1.5 text-muted-foreground/70">· {l.extra}</span>}
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              {l.since && l.value > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/70" title={formatDayTime(l.since)}>
                  {formatRelative(l.since)}
                </span>
              )}
              <span
                className={`font-mono text-sm font-semibold tabular-nums ${
                  l.tone === "falha" ? "text-destructive" : l.tone === "atencao" ? "text-warning" : "text-muted-foreground/50"
                }`}
              >
                {formatCount(l.value)}
              </span>
            </span>
          </div>
        ))
      )}

      {stuck > 0 && (
        <div className="mt-1 space-y-1 rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {formatCount(stuck)} comanda(s) paga(s) há mais de {queues.stuckThresholdMin} min sem virar venda
          </p>
          <ul className="space-y-0.5">
            {queues.closingDetails
              .filter((d) => (d.waitS ?? 0) >= queues.stuckThresholdMin * 60)
              .slice(0, 5)
              .map((d) => (
                <li key={d.barcode} className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                  <span className="text-foreground/90">barcode {d.barcode}</span>
                  <span className="text-muted-foreground" title={formatDayTime(d.requestedAt)}>
                    {formatRelative(d.requestedAt)}
                    {d.attempts > 0 && ` · ${d.attempts} tentativa(s)`}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="border-t border-border/40 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fila agora</h4>
          {!allEmpty && <Tag tone={stuck > 0 ? "falha" : "atencao"}>esperando</Tag>}
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card className="glass-panel">
      <CardContent className="pt-5">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Filas PG ▸ FB (agora)
        </h3>
        {body}
      </CardContent>
    </Card>
  );
}
