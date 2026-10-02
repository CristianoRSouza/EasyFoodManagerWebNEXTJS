/**
 * Regras puras do `SyncEventsPanel` legado (`LEGACY/src/components/sync/SyncEventsPanel.tsx`),
 * extraídas sem mudança de comportamento. `now` é injetável só para teste; o padrão é
 * `Date.now()`, como no legado.
 */
import type { PanelRatePoint, PanelRecentEvent } from "./sync-events-types";

/** Tamanho da página de "últimos eventos" (scroll infinito). */
export const SYNC_EVENTS_PAGE_SIZE = 50;
/** Limite pedido a `fetchers.activeRetries`. */
export const SYNC_ACTIVE_RETRIES_LIMIT = 100;
/** Limite pedido a `fetchers.recentFailures` ("Últimas falhas (top 30)"). */
export const SYNC_RECENT_FAILURES_LIMIT = 30;

/** Legado `fmtRelative`: "12s atrás", "3min atrás", "2h atrás", "5d atrás"; ausente → "—". */
export function formatRelativeAgo(d: string | null, now: number = Date.now()): string {
  if (!d) return "—";
  const diffMs = now - new Date(d).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const d2 = Math.floor(hr / 24);
  return `${d2}d atrás`;
}

/** Legado `nextRetryLabel`. */
export function nextRetryLabel(next: string | null, now: number = Date.now()): string {
  if (!next) return "imediato";
  const diff = new Date(next).getTime() - now;
  if (diff <= 0) return "pronto agora";
  return `em ${Math.ceil(diff / 1000)}s`;
}

/** Inbox: mostrar reenfileirar para failed ou pending com retries (alinhado ao UPDATE ... IN ('failed','pending')). */
export function inboxEventCanRequeue(r: Pick<PanelRecentEvent, "status" | "retry_count">): boolean {
  if (r.status === "failed") return true;
  if (r.status === "pending" && r.retry_count > 0) return true;
  return false;
}

/**
 * Legado `buildStatusBadge(successKey)`: mapa flexível de status
 * (inbox usa "applied", outbox usa "dispatched").
 */
export function syncStatusBadgeStyle(
  successKey: string,
  status: string,
): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "pending", cls: "bg-warning/15 text-warning border-warning/30" },
    [successKey]: { label: successKey, cls: "bg-success/15 text-success border-success/30" },
    failed: { label: "failed", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  return map[status] ?? { label: status, cls: "bg-muted/40 text-muted-foreground border-border" };
}

/** Fundo da linha fechada em "últimos eventos" (aberta: sem fundo de status). */
export function recentEventRowTone(status: string, successKey: string, isOpen: boolean): string {
  if (isOpen) return "";
  if (status === successKey) return "bg-success/5";
  if (status === "failed") return "bg-destructive/5";
  return "bg-warning/5";
}

/** Rótulo do carimbo de sucesso no detalhe do evento. */
export function successTimestampLabel(successKey: string): string {
  return successKey === "applied" ? "Aplicado" : "Despachado";
}

/** KPI da janela de taxa (soma dos pontos por minuto). */
export function sumRate(rate: PanelRatePoint[]): number {
  return rate.reduce((acc, p) => acc + p.por_minuto, 0);
}
