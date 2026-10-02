/**
 * Estado da licença da empresa, para os avisos da UI (`LEGACY/src/hooks/useLicenseStatus.ts`):
 * `expired`, `expiring_soon` (7 dias), `active` ou `unknown` (sem plano — fallback silencioso).
 *
 * Na nuvem a classificação vem PRONTA do servidor (`GET /billing/license`): regra de negócio é da
 * API. Aqui só se valida a forma da resposta e se montam os textos dos avisos.
 */
export type LicenseState = "active" | "expiring_soon" | "expired" | "unknown";

export interface LicenseStatus {
  state: LicenseState;
  planSlug: string | null;
  planName: string | null;
  expiresAt: string | null;
  isActive: boolean | null;
  /** Dias até expirar (negativo = já expirou). `null` se sem data. */
  daysUntilExpiry: number | null;
}

export const UNKNOWN_LICENSE: LicenseStatus = {
  state: "unknown",
  planSlug: null,
  planName: null,
  expiresAt: null,
  isActive: null,
  daysUntilExpiry: null,
};

const STATES = new Set<string>(["active", "expiring_soon", "expired", "unknown"]);

const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

export function toLicenseStatus(raw: unknown): LicenseStatus {
  if (!raw || typeof raw !== "object") return UNKNOWN_LICENSE;
  const row = raw as Record<string, unknown>;
  const state = typeof row.state === "string" && STATES.has(row.state) ? (row.state as LicenseState) : "unknown";
  const days = row.daysUntilExpiry == null || row.daysUntilExpiry === "" ? null : Number(row.daysUntilExpiry);
  return {
    state,
    planSlug: text(row.planSlug),
    planName: text(row.planName),
    expiresAt: text(row.expiresAt),
    isActive: typeof row.isActive === "boolean" ? row.isActive : null,
    daysUntilExpiry: days != null && Number.isFinite(days) ? days : null,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface LicenseBannerCopy {
  isExpired: boolean;
  title: string;
  description: string;
}

/** Textos da faixa do topo; `null` quando não há o que avisar. */
export function licenseBannerCopy(data: LicenseStatus | undefined): LicenseBannerCopy | null {
  if (!data || data.state === "active" || data.state === "unknown") return null;
  const isExpired = data.state === "expired";
  const dateLabel = formatDate(data.expiresAt);
  const title = isExpired ? "Seu plano expirou e não foi renovado" : "Renovação do plano pendente";
  const description = isExpired
    ? data.planName
      ? `A licença do plano ${data.planName} venceu${dateLabel ? ` em ${dateLabel}` : ""}. Revise o pagamento para restaurar todos os recursos.`
      : `A licença venceu${dateLabel ? ` em ${dateLabel}` : ""}. Revise o pagamento para restaurar todos os recursos.`
    : `Sua licença expira em ${data.daysUntilExpiry ?? "poucos"} dia(s)${dateLabel ? ` (${dateLabel})` : ""}. Revise o pagamento para evitar interrupções.`;
  return { isExpired, title, description };
}

/** Ícone de alerta ao lado do plano no cabeçalho; `null` quando não há o que avisar. */
export function headerLicenseWarning(
  data: LicenseStatus | undefined,
): { isExpired: boolean; label: string; tooltip: string } | null {
  if (data?.state !== "expired" && data?.state !== "expiring_soon") return null;
  const isExpired = data.state === "expired";
  return {
    isExpired,
    label: isExpired ? "Plano expirado" : "Plano próximo do vencimento",
    tooltip: isExpired
      ? "Plano expirado — revise o pagamento."
      : `Plano expira em ${data.daysUntilExpiry ?? "poucos"} dia(s).`,
  };
}
