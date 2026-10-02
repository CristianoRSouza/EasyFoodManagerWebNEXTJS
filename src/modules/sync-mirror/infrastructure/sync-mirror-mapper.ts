import { asBoolean, asJsonObject, asNumber, asNumberOrNull, asText, isRecord } from "@/shared/infrastructure/convert";
import type {
  FieldChange,
  MirrorAlarm,
  MirrorCycle,
  MirrorCycleHistoryBucket,
  MirrorCycleHistoryResult,
  MirrorEvent,
  MirrorHealth,
  MirrorJobAggregate,
  MirrorJobStats,
  MirrorJobStatsResult,
  MirrorPendingClosing,
  MirrorQueues,
  MirrorRecordChange,
  MirrorRecordChangesResult,
  MirrorRetention,
} from "../domain/sync-mirror";

/**
 * Formato de fio das rotas `GET /v1/sync/fbpg/*` (`easyfoodmanagerAPI/src/routes/v1/
 * sync-fbpg-panel.ts`) → domínio. As colunas chegam em português (`segundos_desde_ping`,
 * `registros_afetados`…), com `count(*)::int` como número e `bigint` às vezes como texto.
 */

export type Row = Record<string, unknown>;

const isRow = isRecord;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

/** Texto como veio (inclusive vazio), ou `null` — para mensagens, onde "" não é "ausente". */
function asRawString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Data da API: texto ISO, ou `Date` serializada. */
function asIso(value: unknown): string | null {
  return asText(value);
}

export function toMirrorHealth(value: unknown): MirrorHealth | null {
  if (!isRow(value)) return null;
  return {
    lastPing: asIso(value.ultimo_ping),
    windowStart: asIso(value.inicio_janela),
    secondsSincePing: asNumberOrNull(value.segundos_desde_ping),
    heartbeatsRetained: asNumber(value.heartbeats_retidos),
    cyclesLast5Min: asNumber(value.ciclos_5min),
    avgDurationS: asNumberOrNull(value.duracao_media_s),
    maxDurationS: asNumberOrNull(value.duracao_max_s),
  };
}

export function toMirrorCycles(value: unknown): MirrorCycle[] {
  return rows(value).map((r) => ({
    id: asText(r.id) ?? "",
    lastPing: asIso(r.last_ping) ?? "",
    previousPing: asIso(r.ping_anterior),
    durationS: asNumberOrNull(r.duracao_s),
    logLines: asNumber(r.linhas_log),
    recordsAffected: asNumber(r.registros_afetados),
    errors: asNumber(r.erros),
  }));
}

export function toMirrorJobAggregates(value: unknown): MirrorJobAggregate[] {
  return rows(value).map((r) => ({
    direction: asText(r.direcao) ?? "",
    table: asText(r.tabela) ?? "",
    lines: asNumber(r.linhas),
    recordsAffected: asNumber(r.registros_afetados),
    errors: asNumber(r.erros),
    last: asIso(r.ultimo),
  }));
}

export function toMirrorEvents(value: unknown): MirrorEvent[] {
  return rows(value).map((r) => ({
    id: asText(r.id) ?? "",
    createdAt: asIso(r.created_at) ?? "",
    direction: asText(r.direcao) ?? "",
    table: asText(r.tabela) ?? "",
    recordsAffected: asNumber(r.registros_afetados),
    recordId: asText(r.record_id),
    status: asText(r.status) ?? "",
    message: asRawString(r.mensagem),
  }));
}

export function toMirrorAlarms(value: unknown): MirrorAlarm[] {
  return rows(value).map((r) => ({
    direction: asText(r.direcao) ?? "",
    table: asText(r.tabela) ?? "",
    summary: asText(r.resumo) ?? "",
    occurrences: asNumber(r.ocorrencias),
    first: asIso(r.primeiro),
    last: asIso(r.ultimo),
  }));
}

export function toMirrorRetention(value: unknown): MirrorRetention | null {
  if (!isRow(value)) return null;
  return {
    logLines: asNumber(value.log_linhas),
    logOldest: asIso(value.log_mais_antigo),
    logNewest: asIso(value.log_mais_recente),
    heartbeatLines: asNumber(value.heartbeat_linhas),
    heartbeatOldest: asIso(value.heartbeat_mais_antigo),
    trigger035Active: asBoolean(value.gatilho_035_ativo),
    changesLines: asNumberOrNull(value.mudancas_linhas),
    changesOldest: asIso(value.mudancas_mais_antiga),
  };
}

function toJobStats(r: Row): MirrorJobStats {
  return {
    direction: asText(r.direcao) ?? "",
    table: asText(r.tabela) ?? "",
    cycles: asNumber(r.ciclos),
    read: asNumber(r.lidos),
    written: asNumber(r.gravados),
    unchanged: asNumber(r.inalterados),
    errors: asNumber(r.erros),
    lastMinute: asIso(r.ultimo_minuto),
  };
}

export function toMirrorJobStatsResult(value: unknown): MirrorJobStatsResult {
  if (!isRow(value)) return { available: false, rows: [] };
  return { available: asBoolean(value.disponivel), rows: rows(value.linhas).map(toJobStats) };
}

function toPendingClosing(r: Row): MirrorPendingClosing {
  return {
    barcode: asText(r.barcode) ?? "",
    requestedAt: asIso(r.pedido_em),
    attempts: asNumber(r.tentativas),
    waitS: asNumberOrNull(r.espera_s),
  };
}

export function toMirrorQueues(value: unknown): MirrorQueues | null {
  if (!isRow(value)) return null;
  const items = isRow(value.itens) ? value.itens : null;
  const reversals = isRow(value.estornos) ? value.estornos : null;
  const closings = isRow(value.fechamentos) ? value.fechamentos : null;
  return {
    stuckThresholdMin: asNumber(value.limiar_travada_min),
    items: items
      ? { total: asNumber(items.total), orders: asNumber(items.comandas), oldest: asIso(items.mais_antigo) }
      : null,
    reversals: reversals ? { total: asNumber(reversals.total), oldest: asIso(reversals.mais_antigo) } : null,
    closings: closings
      ? {
          total: asNumber(closings.total),
          oldest: asIso(closings.mais_antigo),
          stuck: asNumber(closings.travadas),
          failed: asNumber(closings.com_falha),
          maxAttempts: asNumber(closings.max_tentativas),
        }
      : null,
    closingDetails: rows(value.fechamentos_detalhe).map(toPendingClosing),
  };
}

export function toMirrorCycleHistory(value: unknown, requestedBucketMin: number): MirrorCycleHistoryResult {
  if (!isRow(value)) return { available: false, bucketMin: requestedBucketMin, rows: [] };
  return {
    available: asBoolean(value.disponivel),
    bucketMin: asNumber(value.bucket_min, requestedBucketMin),
    rows: rows(value.linhas).map<MirrorCycleHistoryBucket>((r) => ({
      bucket: asIso(r.balde) ?? "",
      cycles: asNumber(r.ciclos),
      avgMs: asNumber(r.media_ms),
      maxMs: asNumber(r.max_ms),
      minMs: asNumberOrNull(r.min_ms),
      slow: asNumber(r.lentos),
    })),
  };
}

function toFields(value: unknown): string[] | null {
  const list = Array.isArray(value) ? value : asJsonObject<unknown[]>(value);
  if (!Array.isArray(list)) return null;
  return list.map((c) => asText(c)).filter((c): c is string => c !== null);
}

function toDetail(value: unknown): Record<string, FieldChange> | null {
  const raw = asJsonObject<Row>(value);
  if (!raw || Array.isArray(raw)) return null;
  const detail: Record<string, FieldChange> = {};
  for (const [column, change] of Object.entries(raw)) {
    if (isRow(change)) detail[column] = { from: change.de, to: change.para };
  }
  return detail;
}

export function toMirrorRecordChanges(value: unknown): MirrorRecordChangesResult {
  if (!isRow(value)) return { available: false, rows: [] };
  return {
    available: asBoolean(value.disponivel),
    rows: rows(value.linhas).map<MirrorRecordChange>((r) => ({
      id: asText(r.id) ?? "",
      changedAt: asIso(r.changed_at) ?? "",
      direction: asText(r.direcao) ?? "",
      entity: asText(r.entidade) ?? "",
      key: asText(r.chave) ?? "",
      recordId: asText(r.record_id),
      op: asText(r.op) ?? "",
      label: asText(r.rotulo),
      fields: toFields(r.campos),
      detail: toDetail(r.detalhe),
    })),
  };
}
