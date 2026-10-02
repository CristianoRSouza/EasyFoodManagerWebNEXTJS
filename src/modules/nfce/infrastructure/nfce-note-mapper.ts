import { asNumber, asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import { NFCE_STATUS_ALIASES, type NfceNote, type NfceStatus } from "../domain/nfce-note";

export type Row = Record<string, unknown>;

const KNOWN_STATUS: readonly NfceStatus[] = [
  "authorized",
  "rejected",
  "cancelled",
  "draft",
  "unusable",
  "inutilized",
  "denied",
  "sending",
  "manual_review",
];

/** Interpreta o texto do banco; `inutilizada` (alias em português) vira `inutilized`. */
export function toNfceStatus(value: unknown): NfceStatus {
  const text = String(value ?? "").trim().toLowerCase();
  const normalized = NFCE_STATUS_ALIASES[text] ?? text;
  return (KNOWN_STATUS as readonly string[]).includes(normalized) ? (normalized as NfceStatus) : "draft";
}

/** `"03, 17"` → `["03", "17"]`. Vazio vira `[]`, nunca `[""]`. */
export function toPaymentMethods(value: unknown): string[] {
  const text = asText(value);
  if (!text) return [];
  return text
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

export function toNfceNote(row: Row): NfceNote {
  return {
    id: String(row.id ?? ""),
    number: asNumber(row.numero, 0),
    serie: asNumber(row.serie, 0),
    accessKey: asText(row.chave_acesso),
    status: toNfceStatus(row.status),
    statusText: String(row.status ?? "").trim() || undefined,
    totalValue: asNumber(row.valor_total, 0),
    discountValue: asNumber(row.valor_desconto, 0),
    issuedAt: String(row.emissao_em ?? ""),
    authorizedAt: asText(row.autorizada_em),
    protocol: asText(row.protocolo),
    returnCode: asText(row.codigo_retorno),
    returnReason: asText(row.motivo_retorno),
    orderId: asText(row.order_id),
    qrCode: asText(row.qrcode),
    issuerCnpj: String(row.emitente_cnpj ?? ""),
    issuerCompanyName: String(row.emitente_razao ?? ""),
    issuerTradeName: asText(row.emitente_fantasia),
    issuerUf: String(row.emitente_uf ?? ""),
    recipientDocument: asText(row.destinatario_cpf),
    recipientName: asText(row.destinatario_nome),
    itemCount: asNumber(row.qtd_itens, 0),
    paymentMethods: toPaymentMethods(row.formas_pagamento),
    emissionType: asNumberOrNull(row.tipo_emissao),
    reconcileStatus: asText(row.reconcile_status),
    retryCount: asNumberOrNull(row.retry_count),
  };
}
