/**
 * Conversores de linha JSON (EasyFoodAPI/easyfoodmanagerAPI) para tipos do domínio, comuns a
 * todos os módulos.
 *
 * Existem porque a resposta HTTP é sempre `unknown` na prática: campo ausente ou de tipo
 * inesperado não pode virar `"undefined"` dentro de um filtro nem `NaN` num preço — a conversão
 * explícita é a alternativa a `as string`/`as number`. O PostgreSQL devolve `numeric` como texto
 * e `integer` como número, então os dois formatos são aceitos nos dois sentidos.
 */

/** Texto não vazio (números viram texto), ou `null`. */
export function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() !== "" ? value : null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  return null;
}

/** Número a partir de número ou texto; `fallback` (padrão `0`) quando não dá para converter. */
export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Número a partir de número ou texto, ou `null` quando ausente. */
export function asNumberOrNull(value: unknown): number | null {
  return value == null ? null : asNumber(value);
}

/** Booleano (`true`/`"true"`/`"t"`); qualquer outra coisa é `false`. */
export function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "t";
  return false;
}

/** Booleano, ou `null` quando ausente. */
export function asBooleanOrNull(value: unknown): boolean | null {
  return value == null ? null : asBoolean(value);
}

/**
 * Coluna `jsonb` que chega como objeto (driver `pg`) ou como texto JSON (serializada por
 * alguma camada no caminho). Texto inválido, ou qualquer outro tipo, vira `null`.
 */
export function asJsonObject<T extends object>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed !== null && typeof parsed === "object" ? (parsed as T) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as T) : null;
}

/** Objeto simples (linha de API): não nulo, não array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
