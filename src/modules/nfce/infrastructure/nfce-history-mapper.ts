import { asNumber, asText } from "@/shared/infrastructure/convert";
import { formatLogDetails } from "../domain/nfce-formatters";
import type { NfceEvent, NfceLogEntry } from "../domain/nfce-history";
import type { Row } from "./nfce-note-mapper";

/**
 * `nfce_logs.details` é `jsonb` — o `pg` entrega objeto, não string. `asText` sozinho
 * descartaria qualquer objeto (vira `null`), escondendo o motivo de `manual_review`.
 * Aqui: objeto/array vira JSON formatado; string que é JSON numa linha só (nuvem) também é
 * indentada (`formatLogDetails`, legado 1.3.12 PR #29) e texto comum passa como veio; o resto é `null`.
 */
function toLogDetails(value: unknown): string | null {
  if (typeof value === "string") {
    const text = asText(value);
    return text == null ? null : formatLogDetails(text);
  }
  if (value == null) return null;
  return formatLogDetails(value);
}

export function toNfceLogEntry(row: Row): NfceLogEntry {
  return {
    id: String(row.id ?? ""),
    createdAt: String(row.created_at ?? ""),
    type: asText(row.type),
    level: String(row.level ?? ""),
    message: String(row.message ?? ""),
    details: toLogDetails(row.details),
    previousStatus: asText(row.previous_status),
    newStatus: asText(row.new_status),
    returnCode: asText(row.return_code),
    protocol: asText(row.protocol),
    userName: asText(row.user_name),
  };
}

export function toNfceEvent(row: Row): NfceEvent {
  return {
    id: String(row.id ?? ""),
    eventType: String(row.event_type ?? ""),
    description: asText(row.event_description),
    sequence: asNumber(row.event_sequence, 0),
    eventAt: String(row.event_at ?? ""),
    justification: asText(row.justification),
    correction: asText(row.correction),
    protocol: asText(row.protocol),
    sefazStatusCode: asText(row.sefaz_status_code),
    sefazStatusReason: asText(row.sefaz_status_reason),
    registeredAt: asText(row.registered_at),
    situation: asText(row.situation),
    createdAt: String(row.created_at ?? ""),
  };
}
