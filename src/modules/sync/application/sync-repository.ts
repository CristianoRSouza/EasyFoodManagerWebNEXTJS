import type { SyncEventsPanelFetchers } from "@/shared/sync/sync-events-types";
import type { SyncLog } from "../domain/sync-log";
import type { SyncQueue } from "../domain/sync-queue";

/**
 * Porta do monitor de sincronização (`/sync`).
 *
 * - `listLogs`: aba "Log" (pista Firebird → PostgreSQL, `command.sync_log`). Só existe na loja.
 * - `queueFetchers`: os oito agregados do `SyncEventsPanel` de uma fila (inbox/outbox), iguais
 *   na loja e na nuvem.
 * - `resetInboxToPending`: "reenfileirar" um evento do inbox. Só na loja (o legado nunca ofereceu
 *   isto na nuvem: `isLocalInboxRequeueSupported()` é `false` em qualquer modo nuvem).
 */
export interface SyncRepository {
  listLogs(): Promise<SyncLog[]>;
  queueFetchers(queue: SyncQueue): SyncEventsPanelFetchers;
  resetInboxToPending(eventId: string): Promise<void>;
}
