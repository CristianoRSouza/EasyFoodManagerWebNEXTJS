import { normalizeNfceStatus } from "../domain/nfce-formatters";

/**
 * Classes Tailwind de cor para os badges de status/forma de pagamento — apresentação, por isso
 * vivem na camada `ui/`, não em `domain/nfce-formatters.ts` (Menor 5 da revisão da Fase 3: o
 * domínio não deveria conhecer classes CSS).
 */
export const statusColor = (s: string): string => {
  const normalized = normalizeNfceStatus(s);
  const map: Record<string, string> = {
    authorized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    denied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    sending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    unusable: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    inutilized: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    manual_review: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
  };
  return map[normalized] ?? "bg-gray-100 text-gray-600";
};

export const paymentMethodColor = (code: string): string => {
  const map: Record<string, string> = {
    "01": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    "03": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "04": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    "17": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "18": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return map[code] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
};
