import { asText, asNumberOrNull, asBoolean, asBooleanOrNull } from "@/shared/infrastructure/convert";
import type { LicenseLabelRecord } from "@/shared/license/license-labels";
import { hasActiveTotemLicense } from "@/shared/license/totem-license-display";
import { omit } from "../domain/totem-form";
import type {
  TotemAppMode,
  TotemAuditLog,
  TotemConfig,
  TotemConfigFormData,
  TotemLicenseSlot,
  TotemPaymentEnvironment,
  TotemSeriesStatus,
} from "../domain/totem-config";
import type { TotemSeriesOwner } from "../domain/totem-fiscal";

type Row = Record<string, unknown>;

function toAppMode(value: unknown): TotemAppMode {
  return value === "homologacao" || value === "producao" ? value : "demo";
}

function toPaymentEnvironment(value: unknown): TotemPaymentEnvironment {
  return value === "producao" ? "producao" : "homologacao";
}

/** `true` quando a coluna cifrada tem conteúdo — mesma regra de `mapTotemRowFromDb` do legado. */
/**
 * Campo de texto livre: string da API passa CRUA (inclusive ""), o resto cai em `asText`. O legado
 * espalha a linha crua no formulário (`{ ...defaultFormData, ...rest }` / `totemDaApi`), então um
 * `printer_port: ""` volta como "" no PATCH; com `asText` virava `null` e a EasyFoodAPI respondia
 * 500 "Erro interno." (validação de escrita em homologação, 2026-10-01).
 */
function rawText(value: unknown): string | null {
  return typeof value === "string" ? value : asText(value);
}

function ciphertextSet(value: unknown): boolean {
  return value != null && String(value).trim() !== "";
}

/**
 * Linha de `GET /v1/totems` (ou de um item de `POST`/`PATCH`, quando a API devolver a linha) →
 * domínio.
 *
 * INVARIANTE 2 (segredos do totem nunca em claro além do legado): a API já não devolve
 * `aditum_partner_token`/`aditum_activation_code` em claro — este mapper força os dois campos a
 * `null` mesmo assim (defesa redundante, igual ao `mapTotemRowFromDb` do legado) e deriva os
 * flags `_set` a partir da presença do CIPHERTEXT (`aditum_*_encrypted`), não de um flag que o
 * servidor possa esquecer de enviar. O ciphertext (`enc:v1:...`) permanece no objeto de domínio
 * (por paridade com o legado, que também o mantém em `TotemConfig`) mas nenhum componente de UI
 * o lê — só os flags `_set` e os campos em claro (sempre `null` vindos daqui).
 *
 * `nfce_service_api_key`/`tef_http_api_key`/`pix_http_api_key` NÃO são redigidos pela API no modo
 * LAN (conferido em `easyfoodmanagerAPI/src/routes/v1/totems.ts#mapTotemRowToClient` — só os dois
 * campos Aditum têm ciphertext/flag; os três `*_api_key` são colunas de texto simples, chaves de
 * serviço HTTP da própria LAN, não segredos financeiros). O legado faz o mesmo (passa a coluna
 * adiante sem redigir em modo local) — não é uma lacuna introduzida aqui.
 */
export function toTotemConfig(row: Row): TotemConfig {
  const base = toTotemConfigWithoutLicenseRule(row);
  const hasActiveLicense = hasActiveTotemLicense({ license_id: base.license_id, license_status: base.license_status });
  if (hasActiveLicense) return base;
  return {
    ...base,
    is_active: false,
    license_id: null,
    license_status: null,
    license_type: null,
    plan_slug: null,
    license_starts_at: null,
    license_expires_at: null,
    max_transactions_month: null,
  };
}

/**
 * Só a normalização de tipos, SEM a regra "licença ativa" de `toTotemConfig` (que zera `is_active`
 * e os campos de licença quando `license_status !== "active"`, como `mapTotemRowFromDb` do legado
 * no Electron/Admin API). Base do mapper de nuvem: `totemDaApi` (`LEGACY/src/lib/cloud-api-data.ts`)
 * espalha a linha crua e não aplica essa regra — ver fase-4-revisao-final.md, I2.
 */
export function toTotemConfigWithoutLicenseRule(row: Row): TotemConfig {
  return {
    id: asText(row.id) ?? "",
    totem_name: asText(row.totem_name) ?? "",
    is_active: asBoolean(row.is_active),
    app_mode: toAppMode(row.app_mode),
    payment_environment: toPaymentEnvironment(row.payment_environment),
    nfce_environment: asNumberOrNull(row.nfce_environment),
    nfce_serie: asNumberOrNull(row.nfce_serie),
    totem_config_id: asText(row.totem_config_id),
    nfce_service_url: rawText(row.nfce_service_url),
    nfce_service_api_key: asText(row.nfce_service_api_key),
    nfce_service_api_key_set: asBooleanOrNull(row.nfce_service_api_key_set) ?? undefined,
    nfce_emit_timeout_ms: asNumberOrNull(row.nfce_emit_timeout_ms),
    tef_http_base_url: rawText(row.tef_http_base_url),
    tef_http_api_key: asText(row.tef_http_api_key),
    tef_http_api_key_set: asBooleanOrNull(row.tef_http_api_key_set) ?? undefined,

    tef_base_url: rawText(row.tef_base_url),
    tef_insecure_tls: asBooleanOrNull(row.tef_insecure_tls),
    aditum_partner_token: null,
    aditum_partner_token_encrypted: asText(row.aditum_partner_token_encrypted),
    aditum_partner_token_kid: asText(row.aditum_partner_token_kid),
    aditum_partner_token_encrypted_set: ciphertextSet(row.aditum_partner_token_encrypted),
    aditum_activation_code: null,
    aditum_activation_code_encrypted: asText(row.aditum_activation_code_encrypted),
    aditum_activation_code_kid: asText(row.aditum_activation_code_kid),
    aditum_activation_code_encrypted_set: ciphertextSet(row.aditum_activation_code_encrypted),
    establishment_cnpj: rawText(row.establishment_cnpj),
    tef_application_name: rawText(row.tef_application_name),
    tef_application_version: rawText(row.tef_application_version),
    tef_contactless: asBooleanOrNull(row.tef_contactless),
    tef_poll_interval_ms: asNumberOrNull(row.tef_poll_interval_ms),
    tef_poll_max_ms: asNumberOrNull(row.tef_poll_max_ms),
    tef_credit_installment_type: row.tef_credit_installment_type === "Issuer" ? "Issuer" : "Merchant",
    tef_confirm_after_charge: asBooleanOrNull(row.tef_confirm_after_charge),
    tef_claim_source_statuses: rawText(row.tef_claim_source_statuses),
    tef_enable_worker_pending_job: asBooleanOrNull(row.tef_enable_worker_pending_job),
    payment_credit_enabled: asBooleanOrNull(row.payment_credit_enabled),
    payment_debit_enabled: asBooleanOrNull(row.payment_debit_enabled),
    payment_pix_enabled: asBooleanOrNull(row.payment_pix_enabled),
    // Voucher: só entra no domínio se a coluna veio na linha (ver `voucherFields`).
    ...voucherFields(row),

    pix_http_base_url: rawText(row.pix_http_base_url),
    pix_http_api_key: asText(row.pix_http_api_key),
    pix_http_api_key_set: asBooleanOrNull(row.pix_http_api_key_set) ?? undefined,

    image_server_host: rawText(row.image_server_host),
    image_server_port: asNumberOrNull(row.image_server_port),

    printer_enabled: asBooleanOrNull(row.printer_enabled),
    printer_model: rawText(row.printer_model),
    printer_port: rawText(row.printer_port),
    printer_code_page: asNumberOrNull(row.printer_code_page),
    printer_cols_normal: asNumberOrNull(row.printer_cols_normal),
    printer_cut_paper: asBooleanOrNull(row.printer_cut_paper),
    printer_cut_type: asNumberOrNull(row.printer_cut_type),
    printer_translate_tags: asBooleanOrNull(row.printer_translate_tags),
    printer_ignore_tags: asBooleanOrNull(row.printer_ignore_tags),
    printer_verify: asBooleanOrNull(row.printer_verify),
    printer_line_feed_after: asNumberOrNull(row.printer_line_feed_after),
    printer_copies: asNumberOrNull(row.printer_copies),
    printer_timeout_ms: asNumberOrNull(row.printer_timeout_ms),

    last_heartbeat_at: asText(row.last_heartbeat_at),
    heartbeat_machine_id: asText(row.heartbeat_machine_id),

    created_at: asText(row.created_at) ?? "",
    updated_at: asText(row.updated_at) ?? "",

    license_id: asText(row.license_id),
    license_status: asText(row.license_status),
    license_type: asText(row.license_type),
    plan_slug: asText(row.plan_slug),
    license_starts_at: asText(row.license_starts_at),
    license_expires_at: asText(row.license_expires_at),
    max_transactions_month: asNumberOrNull(row.max_transactions_month),
  };
}

export function toTotemSeriesStatus(row: Row): TotemSeriesStatus {
  return {
    totem_config_id: asText(row.totem_config_id) ?? "",
    totem_name: asText(row.totem_name) ?? "",
    environment: asNumberOrNull(row.environment) ?? 2,
    serie: asNumberOrNull(row.serie) ?? 1,
    current_number: asNumberOrNull(row.current_number) ?? 0,
    initial_number: asNumberOrNull(row.initial_number) ?? 0,
    active: asBoolean(row.active),
  };
}

/** Resposta de `GET /v1/totems/series-owner` (`data`) — `TotemSeriesOwner` do legado 1.3.13. */
export function toTotemSeriesOwner(row: Row): TotemSeriesOwner {
  return {
    series_id: asText(row.series_id) ?? "",
    serie: asNumberOrNull(row.serie) ?? 1,
    environment: asNumberOrNull(row.environment) ?? 2,
    current_number: asNumberOrNull(row.current_number) ?? 0,
    owner_totem_id: asText(row.owner_totem_id),
    owner_totem_name: asText(row.owner_totem_name),
    owner_active: asBooleanOrNull(row.owner_active),
  };
}

export function toTotemAuditLog(row: Row): TotemAuditLog {
  return {
    id: asText(row.id) ?? "",
    totem_config_id: asText(row.totem_config_id) ?? "",
    action: row.action === "created" || row.action === "toggled" ? row.action : "updated",
    changed_fields: Array.isArray(row.changed_fields) ? row.changed_fields.map((f) => String(f)) : [],
    previous_values: (row.previous_values as Record<string, unknown> | null) ?? {},
    new_values: (row.new_values as Record<string, unknown> | null) ?? {},
    performed_by: asText(row.performed_by) ?? "",
    created_at: asText(row.created_at) ?? "",
  };
}

/**
 * Domínio (`TotemConfigFormData`, o que o diálogo edita) → corpo de `POST`/`PATCH /v1/totems`.
 *
 * Porta de `totemFormDataToAdminApiBody` do legado: remove os campos derivados/só-leitura
 * (ciphertext, flags `_set`, heartbeat, licença achatada) que a API rejeitaria como
 * `unknown_field`, e só inclui `aditum_partner_token`/`aditum_activation_code` quando o rascunho
 * tem um valor (`undefined` — não `null` — quando o campo não deve ser tocado: ver INVARIANTE 2
 * em `domain/totem-form.ts#buildTotemSubmitPayload`, que já entrega o campo como `undefined`
 * quando deve ser omitido).
 */
const API_BODY_OMITTED_FIELDS = [
  "aditum_partner_token_encrypted",
  "aditum_partner_token_kid",
  "aditum_partner_token_encrypted_set",
  "aditum_activation_code_encrypted",
  "aditum_activation_code_kid",
  "aditum_activation_code_encrypted_set",
  "nfce_service_api_key_set",
  "tef_http_api_key_set",
  "pix_http_api_key_set",
  "last_heartbeat_at",
  "heartbeat_machine_id",
  "license_id",
  "license_status",
  "license_type",
  "plan_slug",
  "license_starts_at",
  "license_expires_at",
  "max_transactions_month",
] as const satisfies readonly (keyof TotemConfigFormData)[];

/**
 * Campos de voucher SÓ quando a coluna veio na linha. O legado espalha a linha crua sobre os padrões
 * do formulário (`TotemFormDialog.tsx`: `{ ...defaultFormData, ...rest }`); a easyfoodmanagerAPI (LAN)
 * não devolve essas colunas, então lá o formulário fica com `false`/"meal" e o PATCH os envia. Com
 * `null` para "ausente", o espalhamento apagaria o padrão e o PATCH iria com `null`/`null`
 * (encontrado na validação de escrita de 2026-10-01). Presente com `null` continua `null`, como no
 * legado.
 */
function voucherFields(row: Row): Pick<TotemConfig, "payment_voucher_enabled" | "payment_voucher_kind"> {
  const out: Pick<TotemConfig, "payment_voucher_enabled" | "payment_voucher_kind"> = {};
  if (Object.prototype.hasOwnProperty.call(row, "payment_voucher_enabled")) {
    out.payment_voucher_enabled = asBooleanOrNull(row.payment_voucher_enabled);
  }
  if (Object.prototype.hasOwnProperty.call(row, "payment_voucher_kind")) {
    out.payment_voucher_kind = toVoucherKind(row.payment_voucher_kind);
  }
  return out;
}

/** `payment_voucher_kind` cru → domínio; valor desconhecido/ausente fica `null` (o formulário assume "meal", como o legado). */
export function toVoucherKind(value: unknown): "meal" | "food" | null {
  return value === "food" || value === "meal" ? value : null;
}

export function toTotemApiBody(data: TotemConfigFormData, licenseId?: string | null): Record<string, unknown> {
  const core = omit(data, API_BODY_OMITTED_FIELDS);
  const body: Record<string, unknown> = { ...core };
  if (licenseId !== undefined) body.license_id = licenseId;
  if (body.aditum_partner_token == null) delete body.aditum_partner_token;
  if (body.aditum_activation_code == null) delete body.aditum_activation_code;
  return body;
}

export function toTotemLicenseSlot(row: Row): TotemLicenseSlot {
  return {
    id: asText(row.id) ?? "",
    device_key: asText(row.device_key) ?? "",
    license_type: asText(row.license_type) ?? "",
    plan_slug: asText(row.plan_slug),
    created_at: asText(row.created_at),
    status: asText(row.status) ?? "",
    totem_config_id: asText(row.totem_config_id),
  };
}

/** `GET /v1/totem-licenses` → `LicenseLabelRecord`, para `buildLicenseLabelMap`. */
export function toLicenseLabelRecord(row: Row): LicenseLabelRecord {
  return {
    id: asText(row.id) ?? "",
    device_key: asText(row.device_key),
    license_type: asText(row.license_type),
    plan_slug: asText(row.plan_slug),
    created_at: asText(row.created_at) ?? "",
  };
}
