import type { SyncMirrorRepository } from "../application/sync-mirror-repository";
import type {
  MirrorAlarm,
  MirrorChangeFilter,
  MirrorCycle,
  MirrorCycleHistoryResult,
  MirrorEvent,
  MirrorEventFilter,
  MirrorHealth,
  MirrorJobAggregate,
  MirrorJobStatsResult,
  MirrorQueues,
  MirrorRecordChangesResult,
  MirrorRetention,
} from "../domain/sync-mirror";
import { apiRequest } from "@/shared/http/api-client";
import { toQueryString } from "@/shared/http/query-string";
import type { Envelope } from "@/shared/http/envelope";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import {
  toMirrorAlarms,
  toMirrorCycleHistory,
  toMirrorCycles,
  toMirrorEvents,
  toMirrorHealth,
  toMirrorJobAggregates,
  toMirrorJobStatsResult,
  toMirrorQueues,
  toMirrorRecordChanges,
  toMirrorRetention,
} from "./sync-mirror-mapper";

/**
 * Query string como a do legado (`query()` em `sync-mirror-data.ts`): ignora só `null`,
 * `undefined` e `""` — `"all"` é um termo de busca válido no Log do serviço, então vai na URL.
 */
function buildQuery(params: Record<string, string | number | null | undefined>): string {
  return toQueryString(params, { dropAll: false });
}

/**
 * Espelho FB↔PG pela easyfoodmanagerAPI da loja — as mesmas 10 rotas e parâmetros que o legado
 * chamava no Modo 2 (`LEGACY/src/lib/sync-mirror-data.ts`). Os padrões (`limit` 100, `offset` 0)
 * são os do legado.
 */
export class ApiSyncMirrorRepository implements SyncMirrorRepository {
  constructor(private readonly tenant: Tenant) {}

  private async get(path: string): Promise<unknown> {
    const response = await apiRequest<Envelope<unknown> | null>(`/sync/fbpg${path}`, { tenant: this.tenant });
    return response?.data ?? null;
  }

  async health(): Promise<MirrorHealth | null> {
    return toMirrorHealth(await this.get("/health"));
  }

  async cycles(limit: number): Promise<MirrorCycle[]> {
    return toMirrorCycles(await this.get(`/cycles${buildQuery({ limit })}`));
  }

  async cycleHistory(hours: number, bucketMin: number): Promise<MirrorCycleHistoryResult> {
    const data = await this.get(`/cycle-history${buildQuery({ hours, bucket_min: bucketMin })}`);
    return toMirrorCycleHistory(data, bucketMin);
  }

  async jobs(minutes: number): Promise<MirrorJobAggregate[]> {
    return toMirrorJobAggregates(await this.get(`/jobs${buildQuery({ minutes })}`));
  }

  async jobStats(minutes: number): Promise<MirrorJobStatsResult> {
    return toMirrorJobStatsResult(await this.get(`/job-stats${buildQuery({ minutes })}`));
  }

  async events(filter: MirrorEventFilter): Promise<MirrorEvent[]> {
    const query = buildQuery({
      limit: filter.limit ?? 100,
      offset: filter.offset ?? 0,
      direction: filter.direction,
      table: filter.table,
      status: filter.status,
      q: filter.q,
    });
    return toMirrorEvents(await this.get(`/events${query}`));
  }

  async queues(): Promise<MirrorQueues | null> {
    return toMirrorQueues(await this.get("/queues"));
  }

  async changes(filter: MirrorChangeFilter): Promise<MirrorRecordChangesResult> {
    const query = buildQuery({
      limit: filter.limit ?? 100,
      offset: filter.offset ?? 0,
      entity: filter.entity,
      q: filter.q,
    });
    return toMirrorRecordChanges(await this.get(`/changes${query}`));
  }

  async alarms(hours: number): Promise<MirrorAlarm[]> {
    return toMirrorAlarms(await this.get(`/alarms${buildQuery({ hours })}`));
  }

  async retention(): Promise<MirrorRetention | null> {
    return toMirrorRetention(await this.get("/retention"));
  }
}
