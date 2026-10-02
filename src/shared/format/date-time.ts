/**
 * Datas vindas da API (ISO 8601) no formato do legado: `toLocale*String("pt-BR")` no fuso do
 * navegador. Valor ausente vira `—`.
 */

const EMPTY = "—";

/** `15/01/2026, 07:20:00` */
export function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("pt-BR") : EMPTY;
}

/** `15/01/2026` */
export function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("pt-BR") : EMPTY;
}
