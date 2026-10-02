/** Formas de pagamento aceitas na correção manual (código fiscal + rótulo) — mesma lista do legado. */
export const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "01 - Dinheiro" },
  { value: "02", label: "02 - Cheque" },
  { value: "03", label: "03 - Cartão de Crédito" },
  { value: "04", label: "04 - Cartão de Débito" },
  { value: "05", label: "05 - Crédito Loja" },
  { value: "10", label: "10 - Vale Alimentação" },
  { value: "11", label: "11 - Vale Refeição" },
  { value: "12", label: "12 - Vale Presente" },
  { value: "13", label: "13 - Vale Combustível" },
  { value: "15", label: "15 - Boleto Bancário" },
  { value: "16", label: "16 - Depósito Bancário" },
  { value: "17", label: "17 - PIX" },
  { value: "18", label: "18 - Transferência Bancária, Carteira Digital" },
  { value: "19", label: "19 - Programa de Fidelidade, Cashback, Crédito Virtual" },
  { value: "90", label: "90 - Sem Pagamento" },
  { value: "99", label: "99 - Outros" },
];
