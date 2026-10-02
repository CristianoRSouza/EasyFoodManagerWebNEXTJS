/** Uma forma de pagamento registrada na NFC-e — `GET /nfce/notes/:id/payments`. */
export interface NfcePayment {
  sequence: number;
  /** Código fiscal (`01` dinheiro, `03` crédito, `17` PIX…) — ver `nfce-formatters.ts`. */
  method: string;
  methodDescription: string;
  amount: number;
  /**
   * Texto cru de `valor`/`troco` como a API mandou (ex.: "136.60"). É o que o formulário de correção
   * edita e reenvia — igual ao legado (`NfceDetailPage.tsx#loadNote`: `String(row.valor ?? "").trim()`).
   * Opcional: só o mapper da API o preenche.
   */
  amountText?: string;
  change: number | null;
  changeText?: string | null;
  integrationType: number | null;
  integrationDescription: string | null;
  cardBrand: string | null;
  cardBrandDescription: string | null;
  authorizationNsu: string | null;
  acquirerCnpj: string | null;
}

/** Soma dos pagamentos menos o troco — o que de fato quita o total da nota. */
export function sumNfcePaymentsNet(payments: NfcePayment[]): number {
  const total = payments.reduce((sum, payment) => sum + payment.amount - (payment.change ?? 0), 0);
  return Math.round(total * 100) / 100;
}
