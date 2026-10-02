import type {
  DashboardStats,
  NfceAttentionCounts,
  ServiceHeartbeats,
  SyncHourBucket,
  SyncLogEntry,
  TransactionDayBucket,
} from "../domain/dashboard-snapshot";
import { asNumber, asText } from "@/shared/infrastructure/convert";

/** Forma bruta de `GET /dashboard/stats` — mesmo contrato na easyfoodmanagerAPI e na EasyFoodAPI. */
export interface RawServiceHeartbeats {
  sync?: string | null;
  nfce?: string | null;
  tef?: string | null;
  sync_pg_sb?: string | null;
  syncPgSb?: string | null;
  pix_pixnopdv_service?: string | null;
  pixPixnopdv?: string | null;
}

export interface RawDashboardStats {
  activeProducts?: number | string;
  openOrders?: number | string;
  todayTransactions?: number | string;
  recentErrors?: number | string;
  lastSuccessSync?: { created_at?: string | null } | null;
  serviceHeartbeats?: RawServiceHeartbeats | null;
}

export interface RawSyncHourBucket {
  hour?: string;
  ok?: number | string;
  error?: number | string;
}

export interface RawTransactionDayBucket {
  day?: string;
  total?: number | string;
  amount?: number | string;
}

export interface RawNfceAttentionCounts {
  manualReview?: number | string;
  reconcileFailed?: number | string;
  unusable?: number | string;
}

/** Forma bruta de uma linha de `sync_log` (`GET /sync/logs`). */
export interface RawSyncLog {
  id?: string | number;
  direction?: string;
  table_name?: string;
  status?: string;
  error_message?: string | null;
  created_at?: string;
}

/** Unifica heartbeats camelCase/snake_case — mesmos aliases do legado (`data-service.ts`). */
export function mapServiceHeartbeats(raw: RawServiceHeartbeats | null | undefined): ServiceHeartbeats {
  const h = raw ?? {};
  return {
    sync: asText(h.sync),
    nfce: asText(h.nfce),
    tef: asText(h.tef),
    syncPgSb: asText(h.syncPgSb ?? h.sync_pg_sb),
    pixPixnopdv: asText(h.pixPixnopdv ?? h.pix_pixnopdv_service),
  };
}

export function mapDashboardStats(raw: RawDashboardStats | null | undefined): DashboardStats {
  const r = raw ?? {};
  const lastSuccessSyncCreatedAt = asText(r.lastSuccessSync?.created_at);
  return {
    activeProducts: asNumber(r.activeProducts, 0),
    openOrders: asNumber(r.openOrders, 0),
    todayTransactions: asNumber(r.todayTransactions, 0),
    recentErrors: asNumber(r.recentErrors, 0),
    lastSuccessSync: lastSuccessSyncCreatedAt ? { createdAt: lastSuccessSyncCreatedAt } : null,
    serviceHeartbeats: mapServiceHeartbeats(r.serviceHeartbeats),
  };
}

export function mapSyncHourBucket(row: RawSyncHourBucket): SyncHourBucket {
  return {
    hour: asText(row.hour) ?? "",
    ok: asNumber(row.ok, 0),
    error: asNumber(row.error, 0),
  };
}

export function mapTransactionDayBucket(row: RawTransactionDayBucket): TransactionDayBucket {
  return {
    day: asText(row.day) ?? "",
    total: asNumber(row.total, 0),
    amount: asNumber(row.amount, 0),
  };
}

export function mapNfceAttentionCounts(raw: RawNfceAttentionCounts | null | undefined): NfceAttentionCounts {
  return {
    manualReview: asNumber(raw?.manualReview, 0),
    reconcileFailed: asNumber(raw?.reconcileFailed, 0),
    unusable: asNumber(raw?.unusable, 0),
  };
}

export function mapSyncLogEntry(row: RawSyncLog): SyncLogEntry {
  return {
    id: String(row.id ?? ""),
    direction: asText(row.direction) ?? "",
    tableName: asText(row.table_name) ?? "",
    status: asText(row.status) ?? "",
    errorMessage: asText(row.error_message),
    createdAt: asText(row.created_at) ?? "",
  };
}
