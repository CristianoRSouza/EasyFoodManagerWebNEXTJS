/**
 * Código de primeiro acesso (H1): a nuvem assina um código que o usuário cola no POS para
 * definir a senha local, sem precisar de outro admin presente na loja. Regras puras — sem
 * `fetch` aqui — para que a validação do email seja testável sem mockar rede.
 *
 * Porta de `LEGACY/src/pages/BootstrapCodePage.tsx` (regex `EMAIL_RE`) e
 * `LEGACY/src/lib/issue-bootstrap-code.ts` (formato do resultado).
 */

const BOOTSTRAP_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mesma validação simples do legado: não é RFC 5322 completo, só o suficiente pra pegar erro de digitação. */
export function isValidBootstrapEmail(email: string): boolean {
  return BOOTSTRAP_EMAIL_RE.test(normalizeBootstrapEmail(email));
}

/** Trim + minúsculas — o código é amarrado a este email exato, então a normalização precisa ser previsível. */
export function normalizeBootstrapEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface IssueBootstrapCodeInput {
  email: string;
  /** Validade em horas; ausente = padrão do servidor (48h, ver texto da tela). */
  ttlHours?: number;
}

/**
 * Resultado da emissão. `ok: false` é o caminho normal de erro — validação do servidor,
 * limite de tentativas etc. — e nunca deve virar uma exceção lançada para a tela (o repositório
 * captura qualquer `ApiError`/falha de rede e converte para este formato).
 */
export interface IssueBootstrapCodeResult {
  ok: boolean;
  code?: string;
  email?: string;
  storeId?: string;
  expiresAt?: string;
  error?: string;
}
