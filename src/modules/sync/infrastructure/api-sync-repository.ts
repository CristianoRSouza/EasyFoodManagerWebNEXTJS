import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import type { SyncEventsPanelFetchers } from "@/shared/sync/sync-events-types";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { SyncRepository } from "../application/sync-repository";
import { SYNC_LOG_FETCH_LIMIT, type SyncLog } from "../domain/sync-log";
import type { SyncQueue } from "../domain/sync-queue";
import { toSyncLog } from "./sync-log-mapper";
import {
  toPanelActiveRetry,
  toPanelBacklogItem,
  toPanelByEntity,
  toPanelFailureGroup,
  toPanelRatePoint,
  toPanelRecentEvent,
  toPanelRecentFailure,
  toPanelSummary,
} from "./sync-queue-mapper";

type Row = Record<string, unknown>;

/**
 * Monitor de sincronização pela API (repasse do Next), nos dois backends.
 *
 * - Loja: `easyfoodmanagerAPI/src/routes/v1/{sync,sync-local-panel}.ts` — as mesmas chamadas que
 *   o legado faz no modo Admin API (`fetchSyncLogs` e `local-sync-monitor.ts`).
 * - Nuvem: as rotas que o cliente `LEGACY/src/lib/cloud-api-data.ts#fetchApiSyncPanel` usa, com
 *   o nome derivado da RPC (`cloud_sync_inbox_by_entity` → `/sync/inbox/by-entity`). O recorte
 *   por loja é do servidor, pelos cabeçalhos de tenant.
 */
export class ApiSyncRepository implements SyncRepository {
  constructor(private readonly tenant: Tenant) {}

  async listLogs(): Promise<SyncLog[]> {
    const response = await apiRequest<Envelope<Row[] | null>>(`/sync/logs?limit=${SYNC_LOG_FETCH_LIMIT}`, {
      tenant: this.tenant,
    });
    return (response?.data ?? []).map(toSyncLog);
  }

  queueFetchers(queue: SyncQueue): SyncEventsPanelFetchers {
    const rate = queue === "inbox" ? "apply-rate" : "dispatch-rate";
    return {
      summary: async () => toPanelSummary(queue, await this.read<unknown>(queue, "summary")),
      byEntity: async () => (await this.rows(queue, "by-entity")).map((r) => toPanelByEntity(queue, r)),
      failures: async () => (await this.rows(queue, "failures-by-error")).map(toPanelFailureGroup),
      activeRetries: async (limit) =>
        (await this.rows(queue, `active-retries?limit=${limit}`)).map((r) => toPanelActiveRetry(queue, r)),
      backlog: async () => (await this.rows(queue, "backlog")).map(toPanelBacklogItem),
      recentFailures: async (limit) =>
        (await this.rows(queue, `recent-failures?limit=${limit}`)).map((r) => toPanelRecentFailure(queue, r)),
      rate: async () => (await this.rows(queue, rate)).map((r) => toPanelRatePoint(queue, r)),
      recentAll: async (limit, offset) =>
        (await this.rows(queue, `recent-all?limit=${limit}&offset=${offset}`)).map((r) => toPanelRecentEvent(queue, r)),
    };
  }

  async resetInboxToPending(eventId: string): Promise<void> {
    const id = (eventId ?? "").trim();
    if (!id) throw new Error("event_id em falta.");
    await apiRequest<Envelope<{ updated: number; event_id: string }>>("/sync/inbox/reset-to-pending", {
      method: "POST",
      body: { event_id: id },
      tenant: this.tenant,
    });
  }

  private async read<T>(queue: SyncQueue, resource: string): Promise<T | null> {
    const response = await apiRequest<Envelope<T | null>>(`/sync/${queue}/${resource}`, { tenant: this.tenant });
    return response?.data ?? null;
  }

  private async rows(queue: SyncQueue, resource: string): Promise<Row[]> {
    const data = await this.read<Row[]>(queue, resource);
    return Array.isArray(data) ? data : [];
  }
}
