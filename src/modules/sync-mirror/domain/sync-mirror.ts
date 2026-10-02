/**
 * Espelho Firebird ↔ PostgreSQL — o modelo do painel `/sync/espelho`.
 *
 * Porta dos tipos de `LEGACY/src/lib/sync-mirror-data.ts`, em inglês e camelCase. A tradução do
 * formato de fio (colunas em português, `snake_case`, das rotas `/v1/sync/fbpg/*` da
 * easyfoodmanagerAPI) fica em `infrastructure/sync-mirror-mapper.ts`.
 *
 * ► POR QUE O CAMPO SE CHAMA `recordsAffected`, E NÃO "gravados"
 *
 *   É `sync_log.records_affected` cru. O significado depende do job (gravado no PostgreSQL ou
 *   escrito no Firebird) e quem aplica o significado é a tela, pela `countSemantics` do catálogo
 *   em `sync-jobs.ts`. Batizar o campo aqui carimbaria uma garantia que o transporte não dá.
 */

/** Vida do serviço, reconstruída de `public.sync_heartbeat` (uma linha por ciclo). */
export interface MirrorHealth {
  lastPing: string | null;
  windowStart: string | null;
  secondsSincePing: number | null;
  heartbeatsRetained: number;
  cyclesLast5Min: number;
  avgDurationS: number | null;
  maxDurationS: number | null;
}

/** Um ciclo: duração do heartbeat + o que a `sync_log` registrou dentro dele. */
export interface MirrorCycle {
  id: string;
  lastPing: string;
  previousPing: string | null;
  durationS: number | null;
  logLines: number;
  recordsAffected: number;
  errors: number;
}

/** Agregado por `(direção, tabela)` numa janela de minutos. */
export interface MirrorJobAggregate {
  direction: string;
  table: string;
  lines: number;
  recordsAffected: number;
  errors: number;
  last: string | null;
}

/** Uma linha crua da `sync_log`, já recortada para a pista FB↔PG. */
export interface MirrorEvent {
  id: string;
  createdAt: string;
  direction: string;
  table: string;
  recordsAffected: number;
  recordId: string | null;
  status: string;
  message: string | null;
}

/** Erros agrupados pelo início da mensagem (os alarmes T1.x do serviço). */
export interface MirrorAlarm {
  direction: string;
  table: string;
  summary: string;
  occurrences: number;
  first: string | null;
  last: string | null;
}

/** Quanto histórico existe de verdade nesta loja — a tela não promete mais que isto. */
export interface MirrorRetention {
  logLines: number;
  logOldest: string | null;
  logNewest: string | null;
  heartbeatLines: number;
  heartbeatOldest: string | null;
  /** `true` = ainda vale o anel de 500 linhas da migração 035 (~4 min), não as 48h da 049. */
  trigger035Active: boolean;
  /** Janela das alterações por registro (30 dias). `null` sem a migração 053. */
  changesLines: number | null;
  changesOldest: string | null;
}

/** Rollup por minuto (`public.sync_job_stats`, migração 050) — a única fonte de "inalterados". */
export interface MirrorJobStats {
  direction: string;
  table: string;
  cycles: number;
  read: number;
  written: number;
  unchanged: number;
  errors: number;
  lastMinute: string | null;
}

/** `available: false` = a loja ainda não recebeu a migração; a tela explica, sem fingir zero. */
export interface MirrorJobStatsResult {
  available: boolean;
  rows: MirrorJobStats[];
}

export interface MirrorPendingClosing {
  barcode: string;
  requestedAt: string | null;
  attempts: number;
  waitS: number | null;
}

/**
 * Filas PG ▸ FB: o que está ESPERANDO para ser escrito no Firebird. Vem das tabelas de negócio,
 * com os mesmos predicados que o serviço usa — a única parte do painel que olha para a frente.
 */
export interface MirrorQueues {
  stuckThresholdMin: number;
  items: { total: number; orders: number; oldest: string | null } | null;
  reversals: { total: number; oldest: string | null } | null;
  closings: {
    total: number;
    oldest: string | null;
    stuck: number;
    failed: number;
    maxAttempts: number;
  } | null;
  closingDetails: MirrorPendingClosing[];
}

/** Histórico longo de duração (migração 052), agregado por balde de N minutos. */
export interface MirrorCycleHistoryBucket {
  bucket: string;
  cycles: number;
  avgMs: number;
  maxMs: number;
  minMs: number | null;
  slow: number;
}

export interface MirrorCycleHistoryResult {
  available: boolean;
  bucketMin: number;
  rows: MirrorCycleHistoryBucket[];
}

/** De→para de uma coluna. */
export interface FieldChange {
  from: unknown;
  to: unknown;
}

/** Uma mudança de REGISTRO (migração 053) — a resposta para "qual mudou". */
export interface MirrorRecordChange {
  id: string;
  changedAt: string;
  direction: string;
  entity: string;
  key: string;
  recordId: string | null;
  op: string;
  /** Rótulo humano: descrição do produto, sigla da unidade. */
  label: string | null;
  /** Colunas que mudaram. Existe SEMPRE — inclusive para as entidades com segredo. */
  fields: string[] | null;
  /** `null` para as entidades que guardam segredo cifrado (migração 054). */
  detail: Record<string, FieldChange> | null;
}

export interface MirrorRecordChangesResult {
  available: boolean;
  rows: MirrorRecordChange[];
}

export type EventStatusFilter = "error" | "success";

export interface MirrorEventFilter {
  limit?: number;
  offset?: number;
  direction?: string | null;
  table?: string | null;
  status?: EventStatusFilter | null;
  q?: string | null;
}

export interface MirrorChangeFilter {
  limit?: number;
  offset?: number;
  entity?: string | null;
  q?: string | null;
}
