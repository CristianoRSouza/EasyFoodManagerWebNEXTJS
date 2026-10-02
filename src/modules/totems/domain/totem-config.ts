import type { TotemLicenseFields } from "@/shared/license/totem-license-display";

/**
 * Tipos do totem — porta fiel de `LEGACY/src/types/totem.types.ts`.
 *
 * Diferente do módulo `issuer` (que converte para camelCase porque calcula coisas como validade
 * de certificado), aqui o "domínio" é praticamente o corpo que a API já devolve e o mesmo corpo
 * que ela aceita de volta: o formulário de totem tem ~60 campos e é uma cópia fiel do JSX do
 * legado, que referencia estes mesmos nomes (`form.nfce_serie`, `t.totem_name`, …). Introduzir um
 * mapeamento camelCase↔snake_case aqui seria tradução sem necessidade — mesma decisão já tomada
 * para `modules/agents` (ver `fase-4-integracao-report.md`: o `pixnopdv`, com 9 campos, passou a
 * camelCase + mapper na integração; aqui o custo/benefício é o inverso).
 *
 * `license_device_key` do legado foi OMITIDO deliberadamente: conferido (grep no legado) que
 * nenhum componente de Totens o lê — `TotemFormDialog` usa `totem.totem_name` como rótulo de
 * fallback da licença atual, nunca `license_device_key`. Confirmado também pelo módulo de
 * referência (`EASYCOMMAND REFATORADO/src/modules/totems/domain/totem.ts`), que não tem campo
 * equivalente.
 */

/** Modo de operação do totem (`nfce_totem_config.app_mode`). */
export type TotemAppMode = "demo" | "homologacao" | "producao";

/** Ambiente PIX/TEF (credenciais) — independente do modo de operação UX. */
export type TotemPaymentEnvironment = "homologacao" | "producao";

/**
 * `extends TotemLicenseFields` (`src/shared/license/totem-license-display.ts`): garante em tempo de
 * compilação que um `TotemConfig` é aceito por `hasActiveTotemLicense`/`effectiveTotemIsActive`
 * sem cast — os dois tipos não podem divergir em silêncio.
 */
export interface TotemConfig extends TotemLicenseFields {
  id: string;
  totem_name: string;
  is_active: boolean;
  app_mode?: TotemAppMode | null;
  payment_environment?: TotemPaymentEnvironment | null;
  /** tpAmb SEFAZ deste totem (1 prod / 2 homolog). */
  nfce_environment?: number | null;
  /** Série NFC-e de emissão deste totem (fonte de verdade fiscal). */
  nfce_serie?: number | null;
  totem_config_id?: string | null;
  nfce_service_url?: string | null;
  nfce_service_api_key?: string | null;
  /** No modo nuvem o valor é redigido pela API — só o flag viaja. No LAN a API devolve em claro. */
  nfce_service_api_key_set?: boolean;
  nfce_emit_timeout_ms?: number | null;
  tef_http_base_url?: string | null;
  tef_http_api_key?: string | null;
  tef_http_api_key_set?: boolean;

  /* ── TEF Aditum Runtime (porta 4090) ── */
  tef_base_url?: string | null;
  tef_insecure_tls?: boolean | null;
  /** Valor em claro só em memória no Admin; nunca vem preenchido da API. */
  aditum_partner_token?: string | null;
  /** Ciphertext `enc:v1:` — presente no objeto (como no legado) mas nunca renderizado pela UI. */
  aditum_partner_token_encrypted?: string | null;
  aditum_partner_token_kid?: string | null;
  aditum_partner_token_encrypted_set?: boolean;
  aditum_activation_code?: string | null;
  aditum_activation_code_encrypted?: string | null;
  aditum_activation_code_kid?: string | null;
  aditum_activation_code_encrypted_set?: boolean;
  establishment_cnpj?: string | null;
  tef_application_name?: string | null;
  tef_application_version?: string | null;
  tef_contactless?: boolean | null;
  tef_poll_interval_ms?: number | null;
  tef_poll_max_ms?: number | null;
  tef_credit_installment_type?: "Merchant" | "Issuer" | null;
  tef_confirm_after_charge?: boolean | null;
  tef_claim_source_statuses?: string | null;
  tef_enable_worker_pending_job?: boolean | null;
  payment_credit_enabled?: boolean | null;
  payment_debit_enabled?: boolean | null;
  payment_pix_enabled?: boolean | null;
  /** Liga/desliga oferta de Voucher (vale-refeição/alimentação) no totem. Default desligado (legado 1.3.12, PR #23). */
  payment_voucher_enabled?: boolean | null;
  /** Tipo fiscal do voucher: meal = Vale Refeição (tPag 11), food = Vale Alimentação (tPag 10). */
  payment_voucher_kind?: "meal" | "food" | null;

  pix_http_base_url?: string | null;
  pix_http_api_key?: string | null;
  pix_http_api_key_set?: boolean;

  image_server_host?: string | null;
  image_server_port?: number | null;

  /* ── Impressora ── */
  printer_enabled?: boolean | null;
  printer_model?: string | null;
  printer_port?: string | null;
  printer_code_page?: number | null;
  printer_cols_normal?: number | null;
  printer_cut_paper?: boolean | null;
  printer_cut_type?: number | null;
  printer_translate_tags?: boolean | null;
  printer_ignore_tags?: boolean | null;
  printer_verify?: boolean | null;
  printer_line_feed_after?: number | null;
  printer_copies?: number | null;
  printer_timeout_ms?: number | null;

  /* ── Heartbeat ── */
  last_heartbeat_at?: string | null;
  heartbeat_machine_id?: string | null;

  created_at: string;
  updated_at: string;

  /* ── Licença vinculada (achatada, como o legado) ── */
  license_id?: string | null;
  license_status?: string | null;
  license_type?: string | null;
  plan_slug?: string | null;
  license_starts_at?: string | null;
  license_expires_at?: string | null;
  max_transactions_month?: number | null;
}

export type TotemConfigFormData = Omit<TotemConfig, "id" | "created_at" | "updated_at">;

/** Linha de numeração (`nfce_series_config`) por totem e ambiente SEFAZ. */
export interface TotemSeriesStatus {
  totem_config_id: string;
  totem_name: string;
  environment: number;
  serie: number;
  current_number: number;
  initial_number: number;
  active: boolean;
}

export interface TotemAuditLog {
  id: string;
  totem_config_id: string;
  action: "created" | "updated" | "toggled";
  changed_fields: string[];
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

/** Slot de licença (`GET /v1/totem-available-licenses` e `/v1/totem-licenses`) — igual a `AvailableTotemLicense` do legado (`lib/cloud-data.ts`). */
export interface TotemLicenseSlot {
  id: string;
  device_key: string;
  license_type: string;
  plan_slug?: string | null;
  created_at?: string | null;
  status: string;
  totem_config_id: string | null;
}
