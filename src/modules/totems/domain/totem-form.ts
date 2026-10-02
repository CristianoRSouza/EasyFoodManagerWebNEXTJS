import type { TotemConfig, TotemConfigFormData } from "./totem-config";

/**
 * Lógica pura do formulário de totem — porta de `LEGACY/src/components/totem/TotemFormDialog.tsx`
 * (constantes, normalizadores e `validate()`), extraída para ser testável sem montar o diálogo de
 * 1.676 linhas do legado. Os valores padrão (`DEFAULTS`) são os MESMOS do legado, incluindo as
 * chaves de sandbox hardcoded ali (não são segredos reais — são credenciais públicas de
 * demonstração já no código-fonte do legado, usadas pelo botão "Restaurar padrões"/novo totem).
 */

/** X-API-Key padrão do nfce-service (Restaurar padrões / novo totem). */
export const NFCE_SERVICE_API_KEY_DEFAULT = "a305c3a2-3ee6-42d5-b2e4-75b95957d946";

/** X-Api-Key padrão do EasyCommandPay-TEF-Aditum-Service (Restaurar padrões / novo totem). */
export const TEF_HTTP_API_KEY_DEFAULT = "74505043-d2a9-416b-aeac-887c65b9996a";

export const TOTEM_FORM_DEFAULTS: TotemConfigFormData = {
  totem_name: "",
  is_active: true,
  app_mode: "demo",
  payment_environment: "homologacao",
  nfce_service_url: "http://127.0.0.1:3002",
  nfce_service_api_key: NFCE_SERVICE_API_KEY_DEFAULT,
  nfce_emit_timeout_ms: 120000,
  nfce_environment: 2,
  nfce_serie: 1,
  tef_http_base_url: "http://127.0.0.1:3090",
  tef_http_api_key: TEF_HTTP_API_KEY_DEFAULT,
  printer_enabled: false,
  printer_model: "0",
  printer_port: "",
  printer_code_page: 2,
  printer_cols_normal: 64,
  printer_cut_paper: true,
  printer_cut_type: 0,
  printer_translate_tags: true,
  printer_ignore_tags: false,
  printer_verify: false,
  printer_line_feed_after: 3,
  printer_copies: 1,
  printer_timeout_ms: 3500,
  tef_base_url: "https://localhost:4090",
  tef_insecure_tls: true,
  aditum_partner_token: "mk_mEfpRag95kyzSHw5FgvBmw",
  aditum_activation_code: "790486992",
  establishment_cnpj: "13971933000178",
  tef_application_name: "EasySoft PDV",
  tef_application_version: "1.0.0",
  tef_contactless: false,
  tef_poll_interval_ms: 600,
  tef_poll_max_ms: 180000,
  tef_credit_installment_type: "Merchant",
  tef_confirm_after_charge: true,
  tef_claim_source_statuses: "pending,tef_requested",
  tef_enable_worker_pending_job: false,
  payment_credit_enabled: true,
  payment_debit_enabled: true,
  payment_pix_enabled: true,
  payment_voucher_enabled: false,
  payment_voucher_kind: "meal",
  image_server_host: "127.0.0.1",
  image_server_port: 3001,
  pix_http_base_url: "http://127.0.0.1:8787",
  pix_http_api_key: "9b8e3f2d6a7c4f1e8d0b5a9c3e6f4a1b7d2c9e5f0a8b6c3d1e4f7a9b2c5d8e0f",
};

export const TOTEM_NAME_REGEX = /^[A-Z0-9\-]+$/;
export const APP_VERSION_REGEX = /^\d{1,3}(\.\d{1,3}){1,3}$/;
export const APP_NAME_MAX = 60;
export const CLAIM_STATUS_TOKEN_REGEX = /^[a-z][a-z0-9_]{0,30}$/;

/**
 * Campo de chave que existe no servidor mas cujo valor não veio (modo nuvem: a EasyFoodAPI
 * devolve só `<campo>_set`). Nesse estado o campo é somente-escrita: mostra que há chave e
 * aceita uma nova; vazio significa "manter".
 */
export function chaveRedigida(valor: unknown, gravada?: boolean): boolean {
  return gravada === true && String(valor ?? "").trim() === "";
}

export function isNfceHttpUrl(s: string): boolean {
  try {
    const u = new URL(String(s).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Aditum Runtime aceita https sempre; http só é permitido em loopback (localhost / 127.0.0.1)
 * porque o runtime expõe um certificado self-signed local.
 */
export function isAditumRuntimeUrl(s: string): { ok: boolean; reason?: string } {
  try {
    const u = new URL(String(s).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, reason: "Use http:// ou https://" };
    }
    if (!u.hostname) return { ok: false, reason: "Host obrigatório" };
    const isLoopback = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
    if (u.protocol === "http:" && !isLoopback) {
      return { ok: false, reason: "http:// só é permitido em localhost/127.0.0.1" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "URL inválida" };
  }
}

/** CNPJ inválido se for sequência única (00000000000000, 11111111111111, …). */
export function isCnpjAllSameDigit(cnpj: string): boolean {
  return /^(\d)\1{13}$/.test(cnpj);
}

/** Remove caracteres de controle e colapsa espaços extras. */
export function sanitizePlainText(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ");
}

export type TotemFormTab = "geral" | "licenca" | "nfce" | "pix" | "tef" | "aditum";

/** Mapeia cada chave de erro para a aba correspondente — mesma regra do legado (`errorTabs`). */
export function mapErrorsToTabs(errors: Record<string, string>): Record<TotemFormTab, boolean> {
  const tabs: Record<TotemFormTab, boolean> = {
    geral: false,
    licenca: false,
    nfce: false,
    pix: false,
    tef: false,
    aditum: false,
  };
  for (const k of Object.keys(errors)) {
    if (!errors[k]) continue;
    if (k === "totem_name" || k === "app_mode") tabs.geral = true;
    else if (k === "license") tabs.licenca = true;
    else if (k.startsWith("nfce_") || k.startsWith("image_server")) tabs.nfce = true;
    else if (k.startsWith("pix_http") || k === "payment_environment") tabs.pix = true;
    else if (k === "tef_http_base_url") tabs.tef = true;
    else tabs.aditum = true;
  }
  return tabs;
}

/**
 * Ajusta o payload antes de enviar: força ambiente/modo para não-produção com licença Demo
 * (defesa redundante — a API já rejeita, mas o legado também protege na UI) e omite os campos de
 * segredo Aditum quando o usuário não digitou nada em edição (evita apagar a cifra existente).
 */
export function buildTotemSubmitPayload(
  form: TotemConfigFormData,
  ctx: { isEditing: boolean; licenseIsDemo: boolean },
): TotemConfigFormData {
  const payload: TotemConfigFormData = { ...form };
  if (ctx.licenseIsDemo && payload.app_mode === "producao") payload.app_mode = "homologacao";
  if (ctx.licenseIsDemo && payload.payment_environment === "producao") payload.payment_environment = "homologacao";
  if (ctx.licenseIsDemo && payload.nfce_environment === 1) payload.nfce_environment = 2;

  const partnerBlank = payload.aditum_partner_token == null || String(payload.aditum_partner_token).trim() === "";
  const activationBlank =
    payload.aditum_activation_code == null || String(payload.aditum_activation_code).trim() === "";
  if (ctx.isEditing && payload.aditum_partner_token_encrypted_set && partnerBlank) {
    payload.aditum_partner_token = undefined;
  }
  if (ctx.isEditing && payload.aditum_activation_code_encrypted_set && activationBlank) {
    payload.aditum_activation_code = undefined;
  }
  return payload;
}

/**
 * Copia `obj` sem as chaves de `keys`. Usado em vez de `const {a, b, ...rest} = obj` quando as
 * chaves removidas não seriam lidas (o padrão de desestruturação dispara
 * `@typescript-eslint/no-unused-vars` para cada uma — este projeto não tem `varsIgnorePattern`
 * configurado para `_`).
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const copy: Partial<T> = { ...obj };
  for (const k of keys) delete copy[k];
  return copy as Omit<T, K>;
}

/**
 * Aviso extra depois de "Totem atualizado com sucesso" quando o voucher não pôde ser gravado.
 * Desvio deliberado do legado (validação de escritas/produção): contra uma API de loja sem as
 * colunas de voucher (migração 045), o legado mostra "Erro ao salvar" embora grave o resto
 * (`assertAdminApiTotemRuntimePersisted`); o Next confirma o que gravou e avisa só do voucher.
 */
export const VOUCHER_NOT_PERSISTED_TOAST = {
  title: "Configuração de voucher não gravada",
  description: "A API desta loja ainda não suporta voucher.",
} as const;

/**
 * O usuário mexeu no voucher, mas a linha que a API devolveu para o totem não tem as colunas de
 * voucher (`totem-mapper.ts#voucherFields` só põe a chave no domínio quando a coluna veio) — logo a
 * API ignora esses campos no PATCH. A comparação parte dos mesmos padrões que o formulário usa
 * ao abrir (`false`/`"meal"`).
 */
export function voucherChangeNotPersisted(original: TotemConfig, submitted: TotemConfigFormData): boolean {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(original, key);
  if (has("payment_voucher_enabled") && has("payment_voucher_kind")) return false;
  const before = {
    enabled: original.payment_voucher_enabled ?? TOTEM_FORM_DEFAULTS.payment_voucher_enabled,
    kind: original.payment_voucher_kind ?? TOTEM_FORM_DEFAULTS.payment_voucher_kind,
  };
  const after = {
    enabled: submitted.payment_voucher_enabled ?? TOTEM_FORM_DEFAULTS.payment_voucher_enabled,
    kind: submitted.payment_voucher_kind ?? TOTEM_FORM_DEFAULTS.payment_voucher_kind,
  };
  return Boolean(before.enabled) !== Boolean(after.enabled) || before.kind !== after.kind;
}

export type TotemNameStatus = "valid" | "invalid" | "duplicate" | null;

export function computeTotemNameStatus(
  totemName: string,
  isEditing: boolean,
  existingNames: string[],
): TotemNameStatus {
  if (!totemName) return null;
  if (!TOTEM_NAME_REGEX.test(totemName)) return "invalid";
  if (!isEditing && existingNames.includes(totemName)) return "duplicate";
  return "valid";
}
