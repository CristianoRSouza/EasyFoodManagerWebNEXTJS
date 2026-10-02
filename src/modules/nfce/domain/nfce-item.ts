/** Um item (produto vendido) de uma NFC-e — `GET /nfce/notes/:id/items`. */
export interface NfceItem {
  sequence: number;
  productCode: string;
  ean: string | null;
  description: string;
  ncm: string;
  cest: string | null;
  cfop: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grossValue: number;
  discount: number | null;
  freight: number | null;
  insurance: number | null;
  otherExpenses: number | null;
  additionalInfo: string | null;
  icms: NfceItemIcms;
  pis: NfceItemTax;
  cofins: NfceItemTax;
  /** Tributos aproximados do item (Lei da Transparência). */
  totalTaxes: number | null;
  /** Migração 024 — indEscala. */
  scaleIndicator: string | null;
  /** Migração 030 — vNFTot por item (reforma tributária). */
  reformItemTotal: number | null;
}

export interface NfceItemIcms {
  origin: number | null;
  /** CST (Regime Normal) ou CSOSN (Simples Nacional) — só um dos dois vem preenchido. */
  cstOrCsosn: string | null;
  base: number | null;
  rate: number | null;
  value: number | null;
  stValue: number | null;
  fcpValue: number | null;
  snCreditRate: number | null;
  snCreditValue: number | null;
  /** Migração 026 — CSOSN 500 (substituição tributária já retida antes). */
  csosn500: NfceItemCsosn500 | null;
}

export interface NfceItemCsosn500 {
  stRate: number | null;
  stRetainedBase: number | null;
  substituteIcms: number | null;
  stRetainedIcms: number | null;
}

export interface NfceItemTax {
  cst: string | null;
  base: number | null;
  rate: number | null;
  value: number | null;
  /** Migração 027 — qBCProd/vAliqProd (base e alíquota em quantidade/reais, não percentual). */
  quantityBase: number | null;
  rateInReais: number | null;
}

/** Soma dos itens (bruto − desconto + frete + seguro + outras despesas). */
export function sumNfceItemsTotal(items: NfceItem[]): number {
  const total = items.reduce(
    (sum, item) =>
      sum + item.grossValue - (item.discount ?? 0) + (item.freight ?? 0) + (item.insurance ?? 0) + (item.otherExpenses ?? 0),
    0,
  );
  return Math.round(total * 100) / 100;
}
