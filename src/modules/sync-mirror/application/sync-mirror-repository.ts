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

/**
 * Leitura do Espelho FB↔PG — as 10 rotas `GET /v1/sync/fbpg/*` da easyfoodmanagerAPI da loja.
 * Somente leitura: o painel é diagnóstico, não opera nada.
 *
 * `health`, `queues` e `retention` devolvem `null` quando a API responde `data: null` (o legado,
 * nesse caso, caía no conjunto de exemplo — que não foi portado).
 */
export interface SyncMirrorRepository {
  health(): Promise<MirrorHealth | null>;
  cycles(limit: number): Promise<MirrorCycle[]>;
  cycleHistory(hours: number, bucketMin: number): Promise<MirrorCycleHistoryResult>;
  jobs(minutes: number): Promise<MirrorJobAggregate[]>;
  jobStats(minutes: number): Promise<MirrorJobStatsResult>;
  events(filter: MirrorEventFilter): Promise<MirrorEvent[]>;
  queues(): Promise<MirrorQueues | null>;
  changes(filter: MirrorChangeFilter): Promise<MirrorRecordChangesResult>;
  alarms(hours: number): Promise<MirrorAlarm[]>;
  retention(): Promise<MirrorRetention | null>;
}
