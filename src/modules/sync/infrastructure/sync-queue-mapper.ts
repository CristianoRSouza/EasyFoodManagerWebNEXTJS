import { asNumber, isRecord } from "@/shared/infrastructure/convert";
import type {
  PanelActiveRetry,
  PanelBacklogItem,
  PanelByEntity,
  PanelFailureGroup,
  PanelRatePoint,
  PanelRecentEvent,
  PanelRecentFailure,
  PanelSummary,
} from "@/shared/sync/sync-events-types";
import type { SyncQueue } from "../domain/sync-queue";

type Row = Record<string, unknown>;

/**
 * Linhas das rotas `/v1/sync/<fila>/*` → formas normalizadas do `SyncEventsPanel`.
 *
 * As mesmas colunas servem aos dois backends: a API da loja (`sync-local-panel.ts`) e a
 * EasyFoodAPI na nuvem devolvem as linhas das RPC `cloud_sync_<fila>_*` (ver
 * `LEGACY/src/lib/cloud-sync-{inbox,outbox}.ts`, função `consultar`). Unifica o mapeamento de
 * `LEGACY/src/lib/local-sync-monitor.ts` (Admin API) e `LEGACY/src/pages/CloudSyncMonitor.tsx`.
 */
const COLUMNS = {
  inbox: {
    success: "applied_total",
    status: "apply_status",
    doneAt: "applied_at",
    queuedAt: "received_at",
    error: "apply_error",
    perMinute: "aplicados_por_minuto",
  },
  outbox: {
    success: "dispatched_total",
    status: "dispatch_status",
    doneAt: "dispatched_at",
    queuedAt: "changed_at",
    error: "dispatch_error",
    perMinute: "despachados_por_minuto",
  },
} as const;

/** `String(v ?? "")` do legado. */
function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function textOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

function asRow(value: unknown): Row {
  return isRecord(value) ? value : {};
}

/** A loja devolve o resumo como objeto; a RPC, como uma linha dentro de um array. */
export function toPanelSummary(queue: SyncQueue, data: unknown): PanelSummary {
  const row = asRow(Array.isArray(data) ? data[0] : data);
  return {
    pending_novos: asNumber(row.pending_novos),
    pending_em_retry: asNumber(row.pending_em_retry),
    success_total: asNumber(row[COLUMNS[queue].success]),
    failed_terminal: asNumber(row.failed_terminal),
    total: asNumber(row.total),
  };
}

export function toPanelByEntity(queue: SyncQueue, row: Row): PanelByEntity {
  return {
    entity_name: text(row.entity_name),
    status: text(row[COLUMNS[queue].status] ?? row.status),
    qtd: asNumber(row.qtd),
    em_retry: asNumber(row.em_retry),
    max_retry: asNumber(row.max_retry),
    mais_antigo: textOrNull(row.mais_antigo),
    mais_recente: textOrNull(row.mais_recente),
  };
}

export function toPanelFailureGroup(row: Row): PanelFailureGroup {
  return {
    entity_name: text(row.entity_name),
    erro_resumido: text(row.erro_resumido),
    qtd: asNumber(row.qtd),
    retries_gastos: asNumber(row.retries_gastos),
    primeiro: textOrNull(row.primeiro),
    ultimo: textOrNull(row.ultimo),
  };
}

/** No outbox a data do evento vem em `changed_at` (o painel a mostra como `received_at`). */
export function toPanelActiveRetry(queue: SyncQueue, row: Row): PanelActiveRetry {
  return {
    event_id: text(row.event_id),
    entity_name: text(row.entity_name),
    op: text(row.op),
    retry_count: asNumber(row.retry_count),
    next_retry_after: textOrNull(row.next_retry_after),
    ultimo_erro: text(row.ultimo_erro),
    received_at: text(row[COLUMNS[queue].queuedAt]),
  };
}

export function toPanelBacklogItem(row: Row): PanelBacklogItem {
  return {
    entity_name: text(row.entity_name),
    pendentes_nunca_tentados: asNumber(row.pendentes_nunca_tentados),
    mais_antigo: textOrNull(row.mais_antigo),
  };
}

export function toPanelRecentFailure(queue: SyncQueue, row: Row): PanelRecentFailure {
  return {
    event_id: text(row.event_id),
    entity_name: text(row.entity_name),
    op: text(row.op),
    retry_count: asNumber(row.retry_count),
    received_at: text(row[COLUMNS[queue].queuedAt]),
    erro: text(row.erro),
  };
}

export function toPanelRatePoint(queue: SyncQueue, row: Row): PanelRatePoint {
  return {
    minuto: text(row.minuto),
    por_minuto: asNumber(row[COLUMNS[queue].perMinute]),
  };
}

export function toPanelRecentEvent(queue: SyncQueue, row: Row): PanelRecentEvent {
  const c = COLUMNS[queue];
  return {
    event_id: text(row.event_id),
    entity_name: text(row.entity_name),
    entity_id: text(row.entity_id),
    op: text(row.op),
    status: text(row[c.status]),
    retry_count: asNumber(row.retry_count),
    applied_at: textOrNull(row[c.doneAt]),
    received_at: text(row[c.queuedAt]),
    apply_error: text(row[c.error]),
    payload: normalizeSyncPayload(row.payload),
  };
}

/** `jsonb` ou texto JSON do PG → valor para o `PayloadDetails` (`normalizePayload` do legado). */
export function normalizeSyncPayload(payload: unknown): unknown {
  if (payload == null) return null;
  if (typeof payload !== "string") return payload;
  const t = payload.trim();
  if (!t) return null;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return payload;
    }
  }
  return payload;
}
