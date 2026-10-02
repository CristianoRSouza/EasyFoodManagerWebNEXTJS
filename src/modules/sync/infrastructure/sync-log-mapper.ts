import { asNumber, asText } from "@/shared/infrastructure/convert";
import type { SyncLog } from "../domain/sync-log";

type Row = Record<string, unknown>;

/**
 * Linha de `GET /v1/sync/logs` (`SELECT * FROM sync_log`) → {@link SyncLog}. O legado usava a
 * linha crua; aqui cada campo é convertido para não virar `"undefined"` num filtro.
 * `error_message` vazio vira `null`: o legado mostrava `—` com `log.error_message || "—"` e
 * escondia a linha de erro do cartão mobile com `log.error_message && …`.
 */
export function toSyncLog(row: Row): SyncLog {
  return {
    id: asText(row.id) ?? "",
    direction: asText(row.direction) ?? "",
    tableName: asText(row.table_name) ?? "",
    recordsAffected: asNumber(row.records_affected),
    recordId: asText(row.record_id),
    status: asText(row.status) ?? "",
    errorMessage: asText(row.error_message),
    createdAt: asText(row.created_at) ?? "",
  };
}
