import { describe, it, expect } from "vitest";
import { toTotemApiBody, toTotemConfig, toTotemSeriesStatus, toTotemAuditLog, toTotemLicenseSlot, toVoucherKind } from "./totem-mapper";
import { TOTEM_FORM_DEFAULTS } from "../domain/totem-form";

const ROW_ACTIVE_LICENSED = {
  id: "t1",
  totem_name: "TOTEM-001",
  is_active: true,
  app_mode: "producao",
  payment_environment: "producao",
  nfce_environment: 1,
  nfce_serie: 3,
  nfce_service_url: "http://127.0.0.1:3002",
  nfce_service_api_key: "chave-nfce",
  nfce_emit_timeout_ms: 120000,
  tef_http_base_url: "http://127.0.0.1:3090",
  tef_http_api_key: "chave-tef",
  tef_base_url: "https://localhost:4090",
  tef_insecure_tls: true,
  aditum_partner_token_encrypted: "enc:v1:AAAA",
  aditum_partner_token_kid: "kid-1",
  aditum_activation_code_encrypted: "enc:v1:BBBB",
  aditum_activation_code_kid: "kid-1",
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
  pix_http_base_url: "http://127.0.0.1:8787",
  pix_http_api_key: "chave-pix",
  image_server_host: "127.0.0.1",
  image_server_port: 3001,
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
  last_heartbeat_at: "2026-01-20T10:00:00Z",
  heartbeat_machine_id: "MACHINE-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-10T00:00:00Z",
  license_id: "lic-1",
  license_device_key: "TOTEM-001",
  license_status: "active",
  license_type: "monthly",
  plan_slug: "ecp-standard",
  license_starts_at: "2026-01-01T00:00:00Z",
  license_expires_at: "2027-01-01T00:00:00Z",
  max_transactions_month: 5000,
};

describe("toTotemConfig", () => {
  it("mapeia os campos básicos e a licença ativa", () => {
    const totem = toTotemConfig(ROW_ACTIVE_LICENSED);
    expect(totem.id).toBe("t1");
    expect(totem.totem_name).toBe("TOTEM-001");
    expect(totem.app_mode).toBe("producao");
    expect(totem.payment_environment).toBe("producao");
    expect(totem.nfce_serie).toBe(3);
    expect(totem.license_id).toBe("lic-1");
    expect(totem.license_type).toBe("monthly");
    expect(totem.plan_slug).toBe("ecp-standard");
    expect(totem.max_transactions_month).toBe(5000);
  });

  it("is_active exige licença ATIVA, mesmo com is_active=true na linha", () => {
    const totem = toTotemConfig({ ...ROW_ACTIVE_LICENSED, license_status: "suspended" });
    expect(totem.is_active).toBe(false);
    // campos de licença some quando não há vínculo ativo — mesma regra da API/legado.
    expect(totem.license_id).toBeNull();
    expect(totem.license_type).toBeNull();
    expect(totem.plan_slug).toBeNull();
  });

  it("sem license_id -> nenhum campo de licença aparece", () => {
    const totem = toTotemConfig({ ...ROW_ACTIVE_LICENSED, license_id: null, license_status: null });
    expect(totem.license_id).toBeNull();
    expect(totem.license_status).toBeNull();
    expect(totem.is_active).toBe(false);
  });

  it("app_mode e payment_environment caem em default quando a coluna é inesperada", () => {
    const totem = toTotemConfig({ ...ROW_ACTIVE_LICENSED, app_mode: "xyz", payment_environment: "xyz" });
    expect(totem.app_mode).toBe("demo");
    expect(totem.payment_environment).toBe("homologacao");
  });

  describe("INVARIANTE 2 — segredos Aditum nunca em claro", () => {
    it("aditum_partner_token/aditum_activation_code SEMPRE null, mesmo que a API (por bug) os devolvesse em claro", () => {
      const totem = toTotemConfig({
        ...ROW_ACTIVE_LICENSED,
        aditum_partner_token: "TOKEN-EM-CLARO",
        aditum_activation_code: "CODIGO-EM-CLARO",
      });
      expect(totem.aditum_partner_token).toBeNull();
      expect(totem.aditum_activation_code).toBeNull();
    });

    it("flags _set derivadas da presença do CIPHERTEXT, não de um flag do servidor", () => {
      const totem = toTotemConfig(ROW_ACTIVE_LICENSED);
      expect(totem.aditum_partner_token_encrypted_set).toBe(true);
      expect(totem.aditum_activation_code_encrypted_set).toBe(true);
    });

    it("sem ciphertext -> flags false", () => {
      const totem = toTotemConfig({
        ...ROW_ACTIVE_LICENSED,
        aditum_partner_token_encrypted: null,
        aditum_activation_code_encrypted: "",
      });
      expect(totem.aditum_partner_token_encrypted_set).toBe(false);
      expect(totem.aditum_activation_code_encrypted_set).toBe(false);
    });

    it("o ciphertext em si fica disponível no objeto (não é segredo em claro) mas nunca é o campo que a UI lê", () => {
      const totem = toTotemConfig(ROW_ACTIVE_LICENSED);
      expect(totem.aditum_partner_token_encrypted).toBe("enc:v1:AAAA");
    });
  });

  it("nfce/tef/pix *_api_key passam em claro no LAN (não são redigidos pela API) — igual ao legado", () => {
    const totem = toTotemConfig(ROW_ACTIVE_LICENSED);
    expect(totem.nfce_service_api_key).toBe("chave-nfce");
    expect(totem.tef_http_api_key).toBe("chave-tef");
    expect(totem.pix_http_api_key).toBe("chave-pix");
  });
});

describe("toTotemSeriesStatus", () => {
  it("mapeia a linha de numeração", () => {
    const row = {
      totem_config_id: "t1",
      totem_name: "TOTEM-001",
      environment: 2,
      serie: 1,
      current_number: 129,
      initial_number: 1,
      active: true,
    };
    expect(toTotemSeriesStatus(row)).toEqual(row);
  });
});

describe("toTotemAuditLog", () => {
  it("mapeia action/changed_fields/valores", () => {
    const row = {
      id: "a1",
      totem_config_id: "t1",
      action: "updated",
      changed_fields: ["totem_name"],
      previous_values: { totem_name: "OLD" },
      new_values: { totem_name: "NEW" },
      performed_by: "admin@local.dev",
      created_at: "2026-01-15T10:00:00Z",
    };
    expect(toTotemAuditLog(row)).toEqual(row);
  });

  it("action desconhecida cai em updated", () => {
    expect(
      toTotemAuditLog({ id: "a1", totem_config_id: "t1", action: "weird", changed_fields: [], previous_values: {}, new_values: {}, performed_by: "x", created_at: "2026-01-01T00:00:00Z" }).action,
    ).toBe("updated");
  });
});

describe("toTotemLicenseSlot", () => {
  it("mapeia um slot de licença", () => {
    const row = { id: "l1", device_key: "TOTEM-001", license_type: "monthly", plan_slug: "ecp-standard", created_at: "2026-01-01T00:00:00Z", status: "active", totem_config_id: null };
    expect(toTotemLicenseSlot(row)).toEqual(row);
  });
});

describe("voucher no cadastro do totem (legado 1.3.12, PR #23)", () => {
  it("lê payment_voucher_enabled e payment_voucher_kind", () => {
    const totem = toTotemConfig({ ...ROW_ACTIVE_LICENSED, payment_voucher_enabled: true, payment_voucher_kind: "food" });
    expect(totem.payment_voucher_enabled).toBe(true);
    expect(totem.payment_voucher_kind).toBe("food");
  });

  // Validação de escrita (2026-10-01): a easyfoodmanagerAPI (LAN) não devolve as colunas de voucher.
  // O legado espalha a linha CRUA sobre os padrões do formulário (`{ ...defaultFormData, ...rest }`),
  // então chave ausente mantém `false`/"meal" e o PATCH leva esses valores. Se o mapper preenchesse
  // a ausência com `null`, o espalhamento apagaria o padrão e o PATCH iria com `null`/`null`.
  it("coluna de voucher AUSENTE na linha não sobrescreve o padrão do formulário (PATCH igual ao legado)", () => {
    expect("payment_voucher_enabled" in ROW_ACTIVE_LICENSED).toBe(false);
    const totem = toTotemConfig(ROW_ACTIVE_LICENSED);
    expect("payment_voucher_enabled" in totem).toBe(false);
    expect("payment_voucher_kind" in totem).toBe(false);
    const body = toTotemApiBody({ ...TOTEM_FORM_DEFAULTS, ...totem });
    expect(body.payment_voucher_enabled).toBe(false);
    expect(body.payment_voucher_kind).toBe("meal");
  });

  it("coluna de voucher PRESENTE com null continua null (mesmo espalhamento do legado)", () => {
    const totem = toTotemConfig({ ...ROW_ACTIVE_LICENSED, payment_voucher_enabled: null, payment_voucher_kind: null });
    expect(totem.payment_voucher_enabled).toBeNull();
    expect(totem.payment_voucher_kind).toBeNull();
  });

  it("tipo desconhecido ou ausente vira null (o formulário assume Vale Refeição)", () => {
    expect(toVoucherKind("outro")).toBeNull();
    expect(toVoucherKind(undefined)).toBeNull();
    expect(toVoucherKind("meal")).toBe("meal");
  });
});
