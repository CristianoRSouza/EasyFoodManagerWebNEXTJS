import type { NfceEvent, NfceLogEntry } from "./nfce-history";
import type { NfceItem } from "./nfce-item";
import type { NfceNote } from "./nfce-note";
import type { NfcePayment } from "./nfce-payment";
import type { NfceXmlKind } from "./nfce-xml";

/**
 * Detalhe completo de uma nota — `GET /nfce/notes/:id`.
 *
 * Modelado como partes compostas, e não como um tipo único de noventa campos espelhando as
 * colunas do banco: quem lê "emitente" ou "totais" entende o que é sem precisar do dicionário de
 * dados. Itens/pagamentos/histórico vêm de rotas próprias (`items`, `payments`, `logs`,
 * `events`) — não fazem parte deste tipo.
 */
export interface NfceDetail {
  note: NfceNote;
  model: string | null;
  emissionPurpose: number | null;
  queryUrl: string | null;
  transactionId: string | null;
  identification: NfceIdentification | null;
  issuer: NfceIssuerDetail;
  recipient: NfceRecipientDetail | null;
  totals: NfceFiscalTotals;
  taxReform: NfceTaxReformTotals;
  documents: NfceDocuments;
  recovery: NfceRecovery;
  /** Informação complementar impressa na nota (`infCpl`). */
  additionalInfo: string | null;
  /** Dados de tributos no campo próprio (`infAdFisco`). */
  taxInfo: string | null;
}

/**
 * Como a nota foi emitida.
 *
 * O ambiente diz se ela vale fiscalmente (produção x homologação), o tipo de emissão diz se
 * saiu em contingência, e a finalidade distingue uma nota normal de uma substituta.
 */
export interface NfceIdentification {
  /** 1 = produção, 2 = homologação — em homologação a nota não tem valor fiscal. */
  environment: number | null;
  emissionType: number | null;
  emissionPurpose: number | null;
  finalConsumer: number | null;
  presence: number | null;
  /** Migração 023 — ide/indIntermed. */
  intermediary: number | null;
  emissionProcess: number | null;
  processVersion: string | null;
  operationNature: string | null;
}

export interface NfceIssuerDetail {
  cnpj: string;
  companyName: string;
  tradeName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  cnae: string | null;
  /** CRT — regime tributário (1 Simples Nacional, 2 Simples c/ excesso, 3 Regime Normal, 4 MEI). */
  taxRegimeCode: number | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  municipality: string | null;
  uf: string;
  zipCode: string | null;
  phone: string | null;
}

export interface NfceRecipientDetail {
  cpf: string | null;
  cnpj: string | null;
  name: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  municipality: string | null;
  uf: string | null;
  zipCode: string | null;
  phone: string | null;
  ieIndicator: number | null;
}

/**
 * Totais fiscais clássicos.
 *
 * `products` é a soma dos itens antes de descontos e acréscimos; `note` é o que o consumidor
 * pagou. Os dois divergirem é normal — confundi-los, não.
 */
export interface NfceFiscalTotals {
  products: number;
  discount: number;
  freight: number;
  insurance: number;
  otherExpenses: number;
  note: number;
  icms: number;
  icmsSt: number;
  ipi: number;
  pis: number;
  cofins: number;
  fcp: number;
}

/**
 * Totais de IBS, CBS e o total agregado da reforma tributária (migração 030).
 *
 * Ficam separados dos totais clássicos de propósito: são regimes diferentes convivendo na
 * mesma nota, e somá-los num número só esconderia qual imposto é qual.
 */
export interface NfceTaxReformTotals {
  /** ICMSTot vTotTrib — tributos aproximados (Lei da Transparência), somados na nota. */
  approximateTaxes: number | null;
  /** Total da nota no novo regime (`vNFTot`, RTRIB). */
  noteTotal: number | null;
  base: number | null;
  ibs: number | null;
  ibsState: number | null;
  ibsStateDiff: number | null;
  ibsStateReturn: number | null;
  ibsCity: number | null;
  ibsCityDiff: number | null;
  ibsCityReturn: number | null;
  cbs: number | null;
  cbsDiff: number | null;
  cbsReturn: number | null;
}

/**
 * Os XML da nota.
 *
 * O autorizado é o documento que vale legalmente; o de cancelamento vale junto com ele quando a
 * nota foi cancelada. Assinado e gerado servem para investigar uma recusa — mostram o que foi
 * enviado, não o que foi aceito.
 *
 * ⟨F3.4⟩ No modo LAN os XML vêm inline (a easyfoodmanagerAPI lê o PG da loja, que não migrou
 * nada); por isso são OPCIONAIS aqui também — a tela não pode assumir presença.
 */
export interface NfceDocuments {
  authorizedXml: string | null;
  cancellationXml: string | null;
  signedXml: string | null;
  generatedXml: string | null;
  /**
   * Quais XML existem, segundo a API (`tem_xml_*`). Só a nuvem manda: lá o detalhe NÃO traz o
   * XML (vem sob demanda de `/nfce/notes/:id/xml/:kind`). Tipo ausente = decide o XML inline.
   */
  xmlAvailability?: Partial<Record<NfceXmlKind, boolean>>;
  qrCode: string | null;
  cancellationProtocol: string | null;
  cancelledAt: string | null;
}

/**
 * O que aconteceu depois de uma recusa, e o que fazer a seguir.
 *
 * É o bloco que responde à pergunta de quem está esperando a nota sair: ela vai tentar de novo,
 * quando, e o que deu errado da última vez.
 */
export interface NfceRecovery {
  reconcileStatus: string | null;
  retryCount: number | null;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  manualFixRequiredAt: string | null;
  manualFixNote: string | null;
  /** Migração 022 — contingência/substituição: quando esta nota substitui outra, ou foi substituída. */
  originNoteId: string | null;
  replacementNoteId: string | null;
  emissionPath: string | null;
}

/** Soma dos itens vs. total declarado na nota — a mesma conferência que a correção manual protege. */
export function itemsMismatch(detail: NfceDetail, itemsTotal: number): number {
  return Number((detail.totals.note - itemsTotal).toFixed(2));
}

export type { NfceEvent, NfceItem, NfceLogEntry, NfcePayment };
