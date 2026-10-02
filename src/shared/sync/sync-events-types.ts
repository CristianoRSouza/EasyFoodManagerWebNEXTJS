/**
 * Formas normalizadas consumidas pelo `SyncEventsPanel` (inbox e outbox; loja e nuvem).
 * Cópia fiel das interfaces exportadas por `LEGACY/src/components/sync/SyncEventsPanel.tsx`.
 * Única mudança: `PanelRecentEvent.payload` era `any`; aqui é `unknown`.
 */

/** Item normalizado para "Por entidade × status". */
export interface PanelByEntity {
  entity_name: string;
  status: string;
  qtd: number;
  em_retry: number;
  max_retry: number;
  mais_antigo: string | null;
  mais_recente: string | null;
}

export interface PanelSummary {
  pending_novos: number;
  pending_em_retry: number;
  success_total: number;
  failed_terminal: number;
  total: number;
}

export interface PanelActiveRetry {
  event_id: string;
  entity_name: string;
  op: string;
  retry_count: number;
  next_retry_after: string | null;
  ultimo_erro: string;
  received_at: string;
}

export interface PanelBacklogItem {
  entity_name: string;
  pendentes_nunca_tentados: number;
  mais_antigo: string | null;
}

export interface PanelFailureGroup {
  entity_name: string;
  erro_resumido: string;
  qtd: number;
  retries_gastos: number;
  primeiro: string | null;
  ultimo: string | null;
}

export interface PanelRecentFailure {
  event_id: string;
  entity_name: string;
  op: string;
  retry_count: number;
  received_at: string;
  erro: string;
}

export interface PanelRatePoint {
  minuto: string;
  por_minuto: number;
}

export interface PanelRecentEvent {
  event_id: string;
  entity_name: string;
  entity_id: string;
  op: string;
  status: string;
  retry_count: number;
  applied_at: string | null;
  received_at: string;
  apply_error: string;
  payload: unknown;
}

/**
 * Porta de dados do painel: cada tela (loja/nuvem × inbox/outbox) injeta a sua implementação.
 * Substitui os ramos Electron/Admin API/Supabase que o legado resolvia em
 * `local-sync-monitor.ts` / `CloudSyncMonitor.tsx` antes de chamar o painel.
 */
export interface SyncEventsPanelFetchers {
  summary: () => Promise<PanelSummary>;
  byEntity: () => Promise<PanelByEntity[]>;
  failures: () => Promise<PanelFailureGroup[]>;
  activeRetries: (limit: number) => Promise<PanelActiveRetry[]>;
  backlog: () => Promise<PanelBacklogItem[]>;
  recentFailures: (limit: number) => Promise<PanelRecentFailure[]>;
  rate: () => Promise<PanelRatePoint[]>;
  recentAll: (limit: number, offset: number) => Promise<PanelRecentEvent[]>;
}
