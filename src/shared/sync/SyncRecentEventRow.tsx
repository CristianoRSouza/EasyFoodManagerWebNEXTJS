"use client";

/**
 * Uma linha expansível de "últimos eventos" do `SyncEventsPanel` legado (JSX/classes/textos
 * idênticos).
 *
 * Desvio documentado: o legado usa `Collapsible` do Radix (`@radix-ui/react-collapsible`), que
 * não é dependência deste projeto (e a Onda 0 não adiciona primitivas). A linha reproduz o DOM
 * que o Radix gera — `div[data-state]` › `button[aria-expanded][aria-controls][data-state]` +
 * `div[data-state=open][id]` montado só quando aberto — sem mudança visual.
 *
 * Desvio 2: no legado o gatilho é um `<button>` com o botão "Reenfileirar" dentro — HTML
 * inválido (botão dentro de botão), que o React acusa como erro de hidratação no SSR. Aqui o
 * gatilho é um `div[role=button][tabIndex=0]` com as mesmas classes (o preflight do Tailwind 3
 * dá `cursor: pointer` a `[role=button]`, igual a `button`), abrindo com clique, Enter ou
 * Espaço como um botão nativo. Teclas vindas do "Reenfileirar" não alternam a linha.
 */
import { useId, type KeyboardEvent } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { formatDateTime as fmtDate } from "@/shared/format/date-time";
import { ErrorSummary } from "./ErrorSummary";
import { PayloadDetails } from "./PayloadDetails";
import { SyncOpBadge, SyncStatusBadge } from "./SyncBadges";
import { inboxEventCanRequeue, recentEventRowTone, successTimestampLabel } from "./sync-events-format";
import type { PanelRecentEvent } from "./sync-events-types";

export interface SyncRecentEventRowProps {
  event: PanelRecentEvent;
  successStatusKey: string;
  isOpen: boolean;
  onToggle: () => void;
  /** Presente só quando a tela permite reenfileirar (inbox local). */
  onRequeue?: (eventId: string) => void;
  requeueing: boolean;
}

export function SyncRecentEventRow({
  event: r,
  successStatusKey,
  isOpen,
  onToggle,
  onRequeue,
  requeueing,
}: SyncRecentEventRowProps) {
  const contentId = useId();
  const state = isOpen ? "open" : "closed";
  const statusBg = recentEventRowTone(r.status, successStatusKey, isOpen);
  const onTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Só a própria linha: Enter/Espaço no botão "Reenfileirar" borbulham até aqui.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <div data-state={state}>
      <div
        role="button"
        tabIndex={0}
        aria-controls={contentId}
        aria-expanded={isOpen}
        data-state={state}
        onClick={onToggle}
        onKeyDown={onTriggerKeyDown}
        className={`w-full text-left px-3 sm:px-4 py-3 transition-colors flex items-start sm:items-center gap-2 sm:gap-3 border-l-4 ${
          isOpen
            ? "bg-primary/10 border-l-primary shadow-[inset_0_-1px_0_0_hsl(var(--primary)/0.3)]"
            : `hover:bg-muted/40 border-l-transparent ${statusBg}`
        }`}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-primary mt-0.5 sm:mt-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5 sm:mt-0" />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 md:grid md:grid-cols-12 md:gap-2 md:items-center">
          <div className="flex items-center justify-between gap-2 md:contents">
            <span className={`md:col-span-2 font-mono text-sm truncate ${isOpen ? "text-primary font-semibold" : ""}`}>{r.entity_name}</span>
            <span className="md:col-span-1">
              <SyncOpBadge op={r.op} />
            </span>
            <span className="md:col-span-2 flex items-center gap-1 flex-wrap">
              <SyncStatusBadge status={r.status} successKey={successStatusKey} />
              {onRequeue && inboxEventCanRequeue(r) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={requeueing}
                  title="Reenfileirar: pending, retries zerados (reprocessar)"
                  aria-label="Reenfileirar evento para reprocessar"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRequeue(r.event_id);
                  }}
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${requeueing ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 md:contents">
            <span className={`md:col-span-3 font-mono text-[11px] sm:text-xs ${isOpen ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {fmtDate(r.applied_at ?? r.received_at)}
            </span>
            <span className="md:col-span-2 text-[11px] sm:text-xs text-muted-foreground md:text-right md:pr-2">
              {r.retry_count > 0 ? `${r.retry_count} retries` : ""}
            </span>
          </div>
          <span className={`hidden md:inline md:col-span-2 font-mono text-xs truncate ${isOpen ? "text-primary" : "text-muted-foreground"}`}>
            {r.entity_id}
          </span>
        </div>
      </div>
      {isOpen && (
        <div data-state="open" id={contentId}>
          <div className="relative px-3 sm:px-10 py-4 bg-primary/5 border-l-4 border-l-primary border-t border-t-primary/20 space-y-3">
            <div className="absolute left-2 top-0 bottom-3 w-0.5 bg-primary/40 rounded-full hidden sm:block" aria-hidden />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground uppercase tracking-wide">Event ID</p>
                <p className="font-mono break-all">{r.event_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wide">Recebido</p>
                <p>{fmtDate(r.received_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wide">{successTimestampLabel(successStatusKey)}</p>
                <p>{fmtDate(r.applied_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wide">Retries</p>
                <p>{r.retry_count}</p>
              </div>
            </div>
            {r.apply_error && (
              <ErrorSummary error={r.apply_error} entityName={r.entity_name} />
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Payload
              </p>
              <div className="rounded-md border border-border/50 bg-background/40 p-3">
                <PayloadDetails data={r.payload} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
