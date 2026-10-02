/**
 * NFC-e — Nota Fiscal de Consumidor eletrônica.
 *
 * Linha da listagem (`GET /nfce/notes`). Diferente dos outros módulos, aqui o estado tem peso
 * legal: uma nota autorizada não pode ser alterada, e o valor total é imutável depois de emitida
 * — ver `nfce-correction.ts`.
 */
export interface NfceNote {
  id: string;
  number: number;
  serie: number;
  accessKey: string | null;
  status: NfceStatus;
  /**
   * Texto cru de `status` como a API mandou — só para EXIBIÇÃO. O legado mostra o status fora do
   * mapa como veio (`statusLabel(s)` devolve `s`); `status` acima dobra o desconhecido em `draft`
   * (regras de negócio), o que exibiria "Rascunho" para, por exemplo, "contingency".
   */
  statusText?: string;
  totalValue: number;
  discountValue: number;
  issuedAt: string;
  authorizedAt: string | null;
  protocol: string | null;
  returnCode: string | null;
  returnReason: string | null;
  orderId: string | null;
  qrCode: string | null;
  issuerCnpj: string;
  issuerCompanyName: string;
  issuerTradeName: string | null;
  issuerUf: string;
  recipientDocument: string | null;
  recipientName: string | null;
  itemCount: number;
  /** Códigos fiscais de forma de pagamento da nota (`01`, `03`, `17`…), sem duplicatas. */
  paymentMethods: string[];
  emissionType: number | null;
  reconcileStatus: string | null;
  retryCount: number | null;
}

/**
 * Apelidos de status em português que o banco/legado ainda produzem → o nome canônico em inglês
 * usado no domínio. Fonte única para `toNfceStatus` (`infrastructure/nfce-note-mapper.ts`) e
 * `normalizeNfceStatus` (`domain/nfce-formatters.ts`), que antes repetiam o mesmo mapa
 * separadamente (Menor 5 da revisão da Fase 3).
 */
export const NFCE_STATUS_ALIASES: Record<string, string> = {
  inutilizada: "inutilized",
};

/** Os estados possíveis de uma nota, como o banco os grava (`nfce_notes.status`). */
export type NfceStatus =
  | "authorized"
  | "rejected"
  | "cancelled"
  | "draft"
  | "unusable"
  | "inutilized"
  | "denied"
  | "sending"
  | "manual_review";

/** Só uma nota neste estado pode receber correção manual — ver `nfce-correction.ts`. */
export const NFCE_EDITABLE_STATUS: NfceStatus = "manual_review";

/** `reconcileStatus` que ainda vale reprocessar, para nota de emissão normal (`emissionType === 1`). */
const RECONCILE_RETRIABLE = ["failed", "consulted_authorized_pending_cancel", "pending_reconcile_origin"];

/**
 * Se a nota pode ser reprocessada pela lista (botão "Reprocessar") — mesma regra do legado, antes
 * duplicada em `NfceDesktopTable.tsx` e `NfceMobileList.tsx` (Menor 2 da revisão da Fase 3).
 */
export function canReprocessNfce(note: NfceNote): boolean {
  const reconcileStatus = (note.reconcileStatus ?? "").toLowerCase();
  const emissionType = note.emissionType ?? 0;
  if (note.status === "manual_review" && emissionType === 9) return true;
  if (note.status === "unusable" && emissionType === 9) return true;
  return emissionType === 1 && RECONCILE_RETRIABLE.includes(reconcileStatus);
}

/**
 * Filtros da listagem — os mesmos que a API aceita em `GET /nfce/notes`, `/nfce/totals` e
 * `/nfce/notes-xml`. `status: "all"` é ignorado por `toQueryString` (não é um filtro real).
 */
export interface NfceListQuery {
  status?: string;
  reconcileStatus?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NfcePage {
  data: NfceNote[];
  total: number;
  page: number;
  limit: number;
}

export interface NfceAttentionCounts {
  manualReview: number;
  reconcileFailed: number;
  unusable: number;
}

/**
 * Totais dos cards do topo da tela — do PERÍODO inteiro, somados no banco.
 *
 * ⚠️ Nunca derive isto das linhas de uma página: com 1.164 notas no filtro e 50 por página, o
 * card "Autorizadas" mostraria 50 e o valor autorizado somaria só essas 50 — sem nenhum sinal de
 * que falta o resto (bug real do legado, corrigido nesta mesma migração).
 */
export interface NfceTotals {
  /** Quantas notas casam com o filtro, ao todo. */
  total: number;
  /** Contagem por status, com a chave CRUA do banco (normalizar é responsabilidade da tela). */
  byStatus: Record<string, number>;
  /** Soma de `total_value` das AUTORIZADAS. */
  authorizedAmount: number;
}
