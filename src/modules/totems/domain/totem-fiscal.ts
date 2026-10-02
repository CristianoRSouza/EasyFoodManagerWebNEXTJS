/**
 * Porta fiel de `LEGACY/src/lib/totem-fiscal.ts` — normaliza campos fiscais do formulário de
 * totem (tpAmb, série). As constantes SQL do legado (`AGENT_SERIES_STATUS_SQL`,
 * `TOTEM_SERIES_STATUS_SQL`) não foram portadas: são consultas ao PostgreSQL local usadas pelo
 * branch Electron/direto do legado; o Next só fala com a API (`GET /v1/totems/series-status`,
 * já implementada em `easyfoodmanagerAPI/src/services/totem-fiscal.ts`).
 */
export function normalizeTotemFiscalFields(input: {
  nfce_environment?: number | null;
  nfce_serie?: number | null;
}): {
  nfceEnvironment: 1 | 2;
  nfceSerie: number;
} {
  const envRaw = input.nfce_environment != null ? Number(input.nfce_environment) : 2;
  const nfceEnvironment: 1 | 2 = envRaw === 1 ? 1 : 2;
  let nfceSerie = 1;
  if (input.nfce_serie != null) {
    const n = Number(input.nfce_serie);
    if (Number.isFinite(n) && n >= 1 && n <= 999) nfceSerie = Math.trunc(n);
  }
  return { nfceEnvironment, nfceSerie };
}

/** Próximo número NFC-e a emitir (current_number + 1). */
export function nextNfceNumberFromSeries(currentNumber: number): number {
  const n = Number(currentNumber);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.trunc(n) + 1;
}

export function formatTpAmbLabel(tpAmb: number | null | undefined): string {
  return Number(tpAmb) === 1 ? "Produção" : "Homologação";
}

export function formatTpAmbShort(tpAmb: number | null | undefined): string {
  return Number(tpAmb) === 1 ? "Prod" : "Homolog";
}

/**
 * Outro dono da série NFC-e no ambiente (`GET /v1/totems/series-owner`) — porta de
 * `TotemSeriesOwner` do legado 1.3.13 (PR #56, `totem-fiscal.ts`). O índice
 * `uk_nfce_series_issuer_legacy` só admite um dono por emitente+série+ambiente: enquanto a série for
 * de outro totem, este não consegue numerar ("Could not allocate…").
 */
export interface TotemSeriesOwner {
  /** `nfce_series_config.id` — é ele que confirma a transferência (`transfer_series_id`). */
  series_id: string;
  serie: number;
  environment: number;
  current_number: number;
  /** null = linha antiga sem totem. */
  owner_totem_id: string | null;
  owner_totem_name: string | null;
  owner_active: boolean | null;
}

/** "A série 1 de homologação está vinculada ao totem TOTEM-01 (inativo)." */
export function describeTotemSeriesOwner(owner: TotemSeriesOwner): string {
  const ambiente = Number(owner.environment) === 1 ? "produção" : "homologação";
  const dono = owner.owner_totem_name
    ? `ao totem ${owner.owner_totem_name} (${owner.owner_active ? "ativo" : "inativo"})`
    : "a uma configuração antiga sem totem";
  return `A série ${owner.serie} de ${ambiente} está vinculada ${dono}.`;
}

/**
 * O que a tela faz antes de salvar — espelha a regra da Admin API (reconcileTotemSeriesOwnership):
 * - `none`: série livre, ou totem salvo inativo (ainda não emite; o checklist do totem acusa);
 * - `confirm_transfer`: dono inativo ou linha sem totem — pergunta e reenvia com `transfer_series_id`;
 * - `blocked`: dono ativo — dois totens ativos não podem dividir a série.
 */
export function decideSeriesOwnerAction(
  owner: TotemSeriesOwner | null,
  totemActive: boolean,
): "none" | "confirm_transfer" | "blocked" {
  if (!owner || !totemActive) return "none";
  return owner.owner_active === true ? "blocked" : "confirm_transfer";
}
