import type { Transaction, TefResultSnapshot } from "./transaction";

/** As vias do comprovante TEF, juntas com quebra de linha (como a impressora as recebe). */
export function formatReceiptLines(lines: (string | null)[] | null | undefined): string {
  if (!lines?.length) return "";
  return lines.map((l) => (l == null || String(l).trim() === "" ? "" : String(l))).join("\n");
}

export function summarizeAditumConfirmation(conf: TefResultSnapshot["aditumConfirmation"]): string {
  if (conf == null) return "—";
  if ("error" in conf && conf.error) return `Erro: ${conf.error}`;
  if ("httpStatus" in conf) {
    const j = conf.json as Record<string, unknown> | undefined;
    const ok = j?.confirmed === true || j?.success === true;
    return `HTTP ${conf.httpStatus}${ok ? " · confirmado" : ""}`;
  }
  return JSON.stringify(conf);
}

export interface TefCancelFbSaleInfo {
  message: string;
}

/**
 * Aviso de que um cancelamento de TEF chegou depois da venda já fechada no Firebird — a
 * comanda foi mantida fechada de propósito (não seria seguro reabri-la sozinho).
 */
export function getTefCancelFbSaleInfo(transaction: Transaction): TefCancelFbSaleInfo | null {
  const flagged =
    transaction.tefCancelFbSaleAlreadyClosed === true ||
    transaction.tefResult?.tefCancelFbSaleAlreadyClosed === true;
  if (!flagged) return null;
  return {
    message:
      transaction.tefCancelFbSaleMessage ||
      transaction.tefResult?.tefCancelAdminMessage ||
      "TEF cancelado, mas a venda ja estava fechada no Firebird; a comanda foi mantida fechada.",
  };
}
