/**
 * Teto do corpo de `POST /api/error-report`, comum ao navegador (que tira a captura de tela do
 * relatório se o corpo passar disto) e ao servidor (que recusa com 413). A captura (`html2canvas`,
 * JPEG 0,6 com no máximo 1280 px de largura, como o legado) de uma página longa pode passar de
 * 1 MiB; 4 MiB cobre o caso comum sem abrir a rota para corpos arbitrários.
 */
export const MAX_REPORT_BYTES = 4 * 1024 * 1024;

/**
 * Maior corpo enviado com `keepalive`. O Fetch recusa com erro de rede todo pedido `keepalive`
 * acima de 64 KiB (somados os pendentes da página); 60 KiB deixa folga. Acima disto o relatório vai
 * por `fetch` normal — a tela de erro fica aberta, então ele chega do mesmo jeito.
 */
export const KEEPALIVE_MAX_BYTES = 60 * 1024;
