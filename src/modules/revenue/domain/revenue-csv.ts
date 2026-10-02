import { rawMethodLabel, type RevenueTransactionRow } from "./revenue";
import { formatDateTime } from "@/shared/format/date-time";

/**
 * As transações aprovadas carregadas na tela, em CSV — mesmo formato do legado
 * (`ReceitasPage.tsx`, função `exportCsv`).
 *
 * Ponto e vírgula como separador e vírgula decimal: é o que o Excel em português abre sem
 * pedir nada. O BOM no início evita que os acentos virem símbolos na planilha.
 */
const HEADER = "data_hora;forma_pagamento;valor;id";
const BOM = "﻿";

export function toApprovedCsv(rows: RevenueTransactionRow[]): string {
  const lines = rows.map((row) => {
    const when = formatDateTime(row.created_at);
    const method = rawMethodLabel(row.payment_method);
    const value = row.amount.toFixed(2).replace(".", ",");
    return `${when};${method};${value};${row.id}`;
  });
  return `${BOM}${HEADER}\n${lines.join("\n")}`;
}

/** Mesmo nome de arquivo do legado: `receitas-aprovadas-tela-{from}-{to}.csv`. */
export function approvedCsvFileName(from: string, to: string): string {
  return `receitas-aprovadas-tela-${from}-${to}.csv`;
}
