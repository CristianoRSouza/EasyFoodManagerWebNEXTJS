import type { Unit } from "../domain/unit";
import { asBoolean, asNumber, asText } from "@/shared/infrastructure/convert";

type Row = Record<string, unknown>;

/**
 * Traduz uma linha de `GET /units` para o domínio.
 *
 * `is_fractional`/`is_active` usam `asBoolean` — não o `Boolean()` nativo, que faria o texto
 * `"false"` virar `true` (qualquer string não vazia é truthy em JS).
 */
export function toUnit(row: Row): Unit {
  return {
    id: String(row.id ?? ""),
    legacyCode: asNumber(row.legacy_code, 0),
    shortDescription: asText(row.short_description) ?? "",
    description: asText(row.description) ?? "",
    isFractional: asBoolean(row.is_fractional),
    isActive: asBoolean(row.is_active),
    createdAt: asText(row.created_at),
  };
}
