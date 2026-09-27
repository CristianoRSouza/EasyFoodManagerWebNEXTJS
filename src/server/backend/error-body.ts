import "server-only";

export interface ApiErrorBody {
  code: string;
  message: string;
}

export function parseJsonSafely(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

function fallbackMessage(status: number): string {
  return status === 503
    ? "Serviço temporariamente indisponível. Tente novamente."
    : `Falha na requisição (HTTP ${status}).`;
}

/**
 * Os dois backends erram em formatos diferentes:
 * - easyfoodmanagerAPI: `{ error: "<texto>", error_code: "<código>" }`
 * - EasyFoodAPI:        `{ error: "<código>", message: "<texto>" }`
 * O navegador recebe sempre `{ code, message }`.
 */
export function toErrorBody(status: number, raw: unknown): ApiErrorBody {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errorCode = asText(body.error_code);
  if (errorCode) {
    return { code: errorCode, message: asText(body.message) ?? asText(body.error) ?? fallbackMessage(status) };
  }
  return {
    code: asText(body.error) ?? `http_${status}`,
    message: asText(body.message) ?? fallbackMessage(status),
  };
}
