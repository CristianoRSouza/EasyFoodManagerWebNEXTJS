import type { NfceDocuments } from "../../domain/nfce-detail";
import type { NfceItem } from "../../domain/nfce-item";
import type { NfceXmlKind } from "../../domain/nfce-xml";

/**
 * Rótulos e pequenas regras de exibição só usadas pela tela de Detalhe — porta verbatim dos
 * helpers inline de `LEGACY/src/pages/NfceDetailPage.tsx`. Ficam aqui (e não no núcleo do
 * módulo) porque são detalhe de apresentação desta tela, não contrato de domínio.
 */

export const presencaLabel = (v: number | null): string => {
  if (v == null) return "—";
  return { 1: "Presencial", 2: "Internet", 3: "Teleatendimento", 4: "Entrega domicílio", 9: "Outros" }[v] ?? String(v);
};

export const finalidadeLabel = (v: number | null): string => {
  if (v == null) return "—";
  return { 1: "Normal", 2: "Complementar", 3: "Ajuste", 4: "Devolução" }[v] ?? String(v);
};

export const tipoEmissaoLabel = (v: number | null): string => {
  if (v == null) return "—";
  return { 1: "Normal", 9: "Contingência Offline" }[v] ?? String(v);
};

export const ieIndicadorLabel = (v: number | null): string => {
  if (v == null) return "—";
  return { 1: "Contribuinte ICMS", 2: "Isento", 9: "Não contribuinte" }[v] ?? String(v);
};

export const indIntermedLabel = (v: number | null | undefined): string => {
  if (v == null) return "—";
  return { 0: "Sem operação com intermediador", 1: "Operação com intermediador" }[v] ?? String(v);
};

export const fmtQty = (v: number | null | undefined): string => {
  if (v == null) return "—";
  return Number.isFinite(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : String(v);
};

/** Só verdadeiro quando o CSOSN 500 (substituição já retida antes) tem algum valor lançado. */
export const hasCsosn500Data = (item: NfceItem): boolean => {
  const c = item.icms.csosn500;
  if (!c) return false;
  return (c.stRate ?? 0) > 0 || (c.stRetainedBase ?? 0) > 0 || (c.substituteIcms ?? 0) > 0 || (c.stRetainedIcms ?? 0) > 0;
};

const LOG_TYPE_LABELS: Record<string, string> = {
  creation: "Criação",
  validation: "Validação",
  signature: "Assinatura",
  send: "Envio",
  authorization: "Autorização",
  rejection: "Rejeição",
  cancellation: "Cancelamento",
  sync_fb: "Sincronização FB",
  error: "Erro",
};

export const logTypeLabel = (t: string | null): string => (t ? (LOG_TYPE_LABELS[t] ?? t) : "");

const EVENT_TYPE_LABELS: Record<string, string> = {
  "110111": "Cancelamento",
  "110110": "Carta de Correção",
  "110130": "Comprovante Entrega",
};

export const eventTypeLabel = (eventType: string): string => EVENT_TYPE_LABELS[eventType] ?? eventType;

const SITUATION_BADGE_CLASSES: Record<string, string> = {
  registered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

export const situationBadgeClass = (situation: string | null): string =>
  SITUATION_BADGE_CLASSES[situation ?? ""] ?? "bg-muted text-muted-foreground";

/** Uma aba de XML: o que mostrar e qual XML buscar — nunca o conteúdo em si (ver `NfceXmlPane`). */
export interface NfceXmlOption {
  key: string;
  label: string;
  kind: NfceXmlKind;
  file: string;
}

/**
 * Se o XML pedido existe — `temXml` do legado: a flag da API decide quando vem (nuvem, onde o
 * detalhe não traz o conteúdo); sem flag, vale o XML inline (loja).
 */
export function hasXml(documents: NfceDocuments, kind: NfceXmlKind): boolean {
  const flag = documents.xmlAvailability?.[kind];
  if (typeof flag === "boolean") return flag;
  const value = {
    authorized: documents.authorizedXml,
    cancellation: documents.cancellationXml,
    signed: documents.signedXml,
    generated: documents.generatedXml,
  }[kind];
  return typeof value === "string" && value.trim() !== "";
}

const TECHNICAL_STATUSES = new Set(["rejected", "denied", "draft", "sending"]);

/**
 * Quais abas de XML mostrar, por status da nota — mesma árvore de decisão do legado:
 * autorizada só mostra o autorizado; cancelada mostra os dois; um status técnico (rejeitada,
 * denegada, rascunho, enviando) mostra o assinado se existir, senão o gerado; qualquer outro
 * status cai no primeiro XML que existir.
 */
export function buildXmlOptions(status: string, documents: NfceDocuments, number: number): NfceXmlOption[] {
  const padded = String(number);
  if (status === "authorized") {
    return [{ key: "authorized", label: "XML Autorizado", kind: "authorized", file: `nfce-${padded}-authorized.xml` }];
  }
  if (status === "cancelled") {
    return [
      { key: "authorized", label: "XML Autorizado", kind: "authorized", file: `nfce-${padded}-authorized.xml` },
      { key: "cancellation", label: "XML Cancelamento", kind: "cancellation", file: `nfce-${padded}-cancelamento.xml` },
    ];
  }
  if (TECHNICAL_STATUSES.has(status)) {
    if (hasXml(documents, "signed")) {
      return [{ key: "technical-signed", label: "XML Técnico (Assinado)", kind: "signed", file: `nfce-${padded}-signed.xml` }];
    }
    return [{ key: "technical-generated", label: "XML Técnico (Gerado)", kind: "generated", file: `nfce-${padded}-generated.xml` }];
  }
  const kinds: NfceXmlKind[] = ["authorized", "signed", "generated", "cancellation"];
  const primeiro = kinds.find((kind) => hasXml(documents, kind)) ?? "authorized";
  return [{ key: "default", label: "XML", kind: primeiro, file: `nfce-${padded}.xml` }];
}

/** Máscara de CPF enquanto o operador digita (mesma regra do legado). */
export const formatCpfMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

/** Máscara de CNPJ enquanto o operador digita (mesma regra do legado). */
export const formatCnpjMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};
