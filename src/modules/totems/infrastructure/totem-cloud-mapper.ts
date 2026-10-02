import { chaveRedigida } from "../domain/totem-form";
import type { TotemConfig, TotemConfigFormData } from "../domain/totem-config";
import { toTotemConfigWithoutLicenseRule } from "./totem-mapper";

type Row = Record<string, unknown>;

/**
 * Linha de `GET /v1/totems` no backend `cloud` (EasyFoodAPI) → domínio.
 *
 * Porta de `totemDaApi` (`LEGACY/src/lib/cloud-api-data.ts`), aplicada POR CIMA da normalização de
 * tipos do mapper comum (`toTotemConfigWithoutLicenseRule`) — SEM a regra "licença ativa" de
 * `toTotemConfig`: `totemDaApi` espalha a linha crua, então `is_active` e os campos de licença
 * chegam como a API mandou (fase-4-revisao-final.md, I2).
 *
 * 1. **Nome do flag.** A EasyFoodAPI responde `aditum_partner_token_set`/
 *    `aditum_activation_code_set` (e não o ciphertext); o domínio lê
 *    `*_encrypted_set`. Sem traduzir, a aba Aditum mostraria o placeholder como se não houvesse
 *    credencial gravada.
 * 2. **Ausente ≠ padrão.** As três chaves de API dos serviços locais não vêm na resposta (só o
 *    `_set`); ficam `null` para o formulário não completar com o DEFAULT e `toTotemCloudApiBody`
 *    omiti-las — senão salvar gravaria a chave padrão por cima da real.
 */
export function toTotemConfigFromCloudApi(row: Row): TotemConfig {
  const base = toTotemConfigWithoutLicenseRule(row);
  const marcado = (...values: unknown[]) => values.some((v) => v === true);
  return {
    ...base,
    aditum_partner_token: null,
    aditum_activation_code: null,
    aditum_partner_token_encrypted_set:
      base.aditum_partner_token_encrypted_set || marcado(row.aditum_partner_token_set, row.aditum_partner_token_encrypted_set),
    aditum_activation_code_encrypted_set:
      base.aditum_activation_code_encrypted_set ||
      marcado(row.aditum_activation_code_set, row.aditum_activation_code_encrypted_set),
    nfce_service_api_key: null,
    tef_http_api_key: null,
    pix_http_api_key: null,
    nfce_service_api_key_set: marcado(row.nfce_service_api_key_set),
    tef_http_api_key_set: marcado(row.tef_http_api_key_set),
    pix_http_api_key_set: marcado(row.pix_http_api_key_set),
  };
}

/**
 * Domínio → corpo de `POST`/`PATCH /v1/totems` no backend `cloud` (EasyFoodAPI).
 *
 * Porta literal de `corpoTotem` (`LEGACY/src/lib/cloud-api-data.ts`): diferente do LAN
 * (`toTotemApiBody`, que envia tudo MENOS uma lista de exclusão), o cliente cloud do legado monta
 * o corpo por LISTA EXPLÍCITA de inclusão (`CAMPOS_TOTEM`) — o schema de lá é tratado como
 * estrito pelo legado, e a contrapartida documentada é que campo novo no formulário só é salvo se
 * entrar nesta lista. As três chaves de API (`nfce_service_api_key`/`tef_http_api_key`/
 * `pix_http_api_key`) são OMITIDAS quando já gravadas e o campo continua em branco
 * (`chaveRedigida`) — no cloud a API as redige (só `_set` viaja), mandar vazio apagaria a chave
 * real. `totem_name`/`is_active`/`license_id` e os segredos Aditum têm a mesma regra do legado
 * (Aditum só entra se o usuário digitou algo).
 */
const CLOUD_API_BODY_FIELDS = [
  "app_mode",
  "payment_environment",
  "nfce_environment",
  "nfce_serie",
  "nfce_service_url",
  "nfce_service_api_key",
  "nfce_emit_timeout_ms",
  "tef_http_base_url",
  "tef_http_api_key",
  "tef_base_url",
  "tef_insecure_tls",
  "establishment_cnpj",
  "tef_application_name",
  "tef_application_version",
  "tef_contactless",
  "tef_poll_interval_ms",
  "tef_poll_max_ms",
  "tef_credit_installment_type",
  "tef_confirm_after_charge",
  "tef_claim_source_statuses",
  "tef_enable_worker_pending_job",
  "pix_http_base_url",
  "pix_http_api_key",
  "payment_credit_enabled",
  "payment_debit_enabled",
  "payment_pix_enabled",
  "payment_voucher_enabled",
  "payment_voucher_kind",
  "printer_enabled",
  "printer_model",
  "printer_port",
  "printer_code_page",
  "printer_cols_normal",
  "printer_cut_paper",
  "printer_cut_type",
  "printer_translate_tags",
  "printer_ignore_tags",
  "printer_verify",
  "printer_line_feed_after",
  "printer_copies",
  "printer_timeout_ms",
  "image_server_host",
  "image_server_port",
] as const satisfies readonly (keyof TotemConfigFormData)[];

/** Campo de chave de API → campo `_set` que sinaliza "já gravada" (mesma tabela de `corpoTotem`). */
const CLOUD_API_REDACTED_KEY_FLAGS: Partial<Record<(typeof CLOUD_API_BODY_FIELDS)[number], keyof TotemConfigFormData>> = {
  nfce_service_api_key: "nfce_service_api_key_set",
  tef_http_api_key: "tef_http_api_key_set",
  pix_http_api_key: "pix_http_api_key_set",
};

export function toTotemCloudApiBody(data: TotemConfigFormData, licenseId?: string | null): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of CLOUD_API_BODY_FIELDS) {
    const value = data[field];
    if (value === undefined) continue;
    const flagField = CLOUD_API_REDACTED_KEY_FLAGS[field];
    if (flagField && chaveRedigida(value, data[flagField] as boolean | undefined)) continue;
    body[field] = value;
  }
  if (typeof data.totem_name === "string") body.totem_name = data.totem_name;
  if (typeof data.is_active === "boolean") body.is_active = data.is_active;
  if (licenseId !== undefined) body.license_id = licenseId ?? null;
  for (const secretField of ["aditum_partner_token", "aditum_activation_code"] as const) {
    const value = data[secretField];
    if (typeof value === "string" && value.trim() !== "") body[secretField] = value;
  }
  return body;
}
