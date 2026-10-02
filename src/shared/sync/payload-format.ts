import { isRecord } from "@/shared/infrastructure/convert";

/**
 * Formatação de valores do payload (chave/valor amigável, sem JSON cru).
 *
 * Lógica pura extraída de `LEGACY/src/components/sync/PayloadDetails.tsx`
 * (`formatValue`, `isPlainObject`), sem mudança de regra.
 */

export function formatPayloadValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    // ISO date detection
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      try {
        return new Date(v).toLocaleString("pt-BR");
      } catch {
        return v;
      }
    }
    return v;
  }
  return String(v);
}

/** Nome do legado (`PayloadDetails.tsx`) para o `isRecord` comum. */
export const isPlainObject = isRecord;
