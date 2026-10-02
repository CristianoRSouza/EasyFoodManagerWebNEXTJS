/**
 * Indicadores da tela inicial.
 *
 * Mantém os mesmos nomes de campo do legado (`src/lib/data-service.ts`,
 * `fetchDashboardStats`/`fetchSyncByHour`/`fetchTransactionsByDay`/`fetchSyncLogs`/
 * `fetchNfceAttentionCounts`) de propósito: a tela é uma cópia visual 1:1, e usar os mesmos
 * nomes evita uma tradução que não muda nada.
 *
 * `syncByHour` e `recentErrors` vêm vazios na nuvem — as tabelas `sync_log`/`sync_heartbeat`
 * só existem no PostgreSQL da loja (ver `ApiDashboardRepository`). Não é uma falha silenciosa:
 * é a mesma decisão que o painel legado já toma escondendo essas seções fora do modo loja.
 */

export interface ServiceHeartbeats {
  sync: string | null;
  nfce: string | null;
  tef: string | null;
  syncPgSb: string | null;
  pixPixnopdv: string | null;
}

export const EMPTY_SERVICE_HEARTBEATS: ServiceHeartbeats = {
  sync: null,
  nfce: null,
  tef: null,
  syncPgSb: null,
  pixPixnopdv: null,
};

export interface LastSuccessSync {
  createdAt: string;
}

export interface DashboardStats {
  activeProducts: number;
  openOrders: number;
  todayTransactions: number;
  /** Linhas de `sync_log` com erro nas últimas 24h. Só usado quando `backend === "lan"`. */
  recentErrors: number;
  lastSuccessSync: LastSuccessSync | null;
  serviceHeartbeats: ServiceHeartbeats;
}

export interface SyncHourBucket {
  hour: string;
  ok: number;
  error: number;
}

export interface TransactionDayBucket {
  day: string;
  total: number;
  amount: number;
}

export interface NfceAttentionCounts {
  manualReview: number;
  reconcileFailed: number;
  unusable: number;
}

/** Uma linha de `sync_log`. */
export interface SyncLogEntry {
  id: string;
  direction: string;
  tableName: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface DashboardSnapshot {
  stats: DashboardStats;
  syncByHour: SyncHourBucket[];
  transactionsByDay: TransactionDayBucket[];
  /** Entradas de `sync_log` com falha, já filtradas — no máximo 10, mais recentes primeiro. */
  recentErrors: SyncLogEntry[];
  nfceAttention: NfceAttentionCounts;
  /**
   * Partes que falharam nesta consulta (ex.: `"nfceAttention"`) e ficaram com o valor zerado —
   * uma falha isolada não derruba o snapshot inteiro (`Promise.allSettled` no repositório).
   */
  failedParts: string[];
}

export const EMPTY_DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  stats: {
    activeProducts: 0,
    openOrders: 0,
    todayTransactions: 0,
    recentErrors: 0,
    lastSuccessSync: null,
    serviceHeartbeats: EMPTY_SERVICE_HEARTBEATS,
  },
  syncByHour: [],
  transactionsByDay: [],
  recentErrors: [],
  nfceAttention: { manualReview: 0, reconcileFailed: 0, unusable: 0 },
  failedParts: [],
};

export function totalNeedingAttention(attention: NfceAttentionCounts): number {
  return attention.manualReview + attention.reconcileFailed + attention.unusable;
}

/**
 * As entradas de `sync_log` que exigem atenção: tudo que não é `success`/`ok`, limitado ao
 * topo da lista. A ordenação já vem pronta da API (`ORDER BY created_at DESC`) — aqui só se
 * filtra e corta, sem reordenar.
 */
export function filterRecentSyncErrors(logs: SyncLogEntry[], limit = 10): SyncLogEntry[] {
  return logs.filter((log) => log.status !== "success" && log.status !== "ok").slice(0, limit);
}
