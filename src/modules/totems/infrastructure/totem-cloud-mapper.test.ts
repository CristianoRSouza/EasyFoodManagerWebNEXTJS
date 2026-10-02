import { toTotemCloudApiBody, toTotemConfigFromCloudApi } from "./totem-cloud-mapper";
import { TOTEM_FORM_DEFAULTS, omit } from "../domain/totem-form";

const cloudRow = {
  id: "t1",
  totem_name: "TOTEM-001",
  is_active: true,
  license_id: "lic-1",
  license_status: "active",
  app_mode: "producao",
  payment_environment: "producao",
  // Formato da EasyFoodAPI: só o booleano `_set`, nunca o ciphertext nem o valor.
  aditum_partner_token_set: true,
  aditum_activation_code_set: false,
  nfce_service_api_key_set: true,
  tef_http_api_key_set: false,
  pix_http_api_key_set: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// Validação de escrita em homologação (2026-10-01): o legado espalha a linha CRUA da EasyFoodAPI no
// formulário (`totemDaApi`), então `printer_port: ""` volta como "" no PATCH. O Next convertia "" em
// `null` (`asText`) e a EasyFoodAPI respondeu 500 "Erro interno." ao salvar um totem real.
describe("texto vazio da linha continua texto vazio no corpo (igual ao legado)", () => {
  it('printer_port "" vai como "" no PATCH da nuvem', () => {
    const totem = toTotemConfigFromCloudApi({ ...cloudRow, printer_port: "", printer_model: "", nfce_service_url: "" });
    const body = toTotemCloudApiBody({ ...TOTEM_FORM_DEFAULTS, ...omit(totem, ["id", "created_at", "updated_at"] as const) });
    expect(body.printer_port).toBe("");
    expect(body.printer_model).toBe("");
    expect(body.nfce_service_url).toBe("");
  });

  it("texto preenchido e ausente continuam como antes", () => {
    const totem = toTotemConfigFromCloudApi({ ...cloudRow, printer_port: "COM3" });
    expect(totem.printer_port).toBe("COM3");
    expect(toTotemConfigFromCloudApi(cloudRow).printer_port).toBeNull();
  });
});

describe("toTotemConfigFromCloudApi (porta de totemDaApi)", () => {
  it("traduz aditum_*_set da EasyFoodAPI para *_encrypted_set do domínio", () => {
    const totem = toTotemConfigFromCloudApi(cloudRow);
    expect(totem.aditum_partner_token_encrypted_set).toBe(true);
    expect(totem.aditum_activation_code_encrypted_set).toBe(false);
  });

  it("nunca expõe segredos nem chaves de API, mesmo se a linha trouxesse valores", () => {
    const totem = toTotemConfigFromCloudApi({
      ...cloudRow,
      aditum_partner_token: "segredo",
      aditum_activation_code: "codigo",
      nfce_service_api_key: "k1",
      tef_http_api_key: "k2",
      pix_http_api_key: "k3",
    });
    expect(totem.aditum_partner_token).toBeNull();
    expect(totem.aditum_activation_code).toBeNull();
    expect(totem.nfce_service_api_key).toBeNull();
    expect(totem.tef_http_api_key).toBeNull();
    expect(totem.pix_http_api_key).toBeNull();
    expect(totem.nfce_service_api_key_set).toBe(true);
    expect(totem.tef_http_api_key_set).toBe(false);
    expect(totem.pix_http_api_key_set).toBe(true);
  });

  it("combinado com o formulário, chave já gravada e não tocada fica FORA do corpo (não grava o default por cima)", () => {
    const totem = toTotemConfigFromCloudApi(cloudRow);
    const rest = omit(totem, ["id", "created_at", "updated_at"] as const);
    const form = { ...TOTEM_FORM_DEFAULTS, ...rest };
    const body = toTotemCloudApiBody(form, "lic-1");
    expect(body).not.toHaveProperty("nfce_service_api_key");
    expect(body).not.toHaveProperty("pix_http_api_key");
    expect(body).not.toHaveProperty("aditum_partner_token");
    expect(body.license_id).toBe("lic-1");
    expect(body.totem_name).toBe("TOTEM-001");
  });
});

describe("toTotemConfigFromCloudApi — sem a regra de licença ativa (I2)", () => {
  // `totemDaApi` espalha a linha crua: `is_active` e os campos de licença chegam como a API
  // mandou. A regra "licença ativa" é do `mapTotemRowFromDb` (Electron/Admin API) — só no LAN.
  it("mantém is_active e os campos de licença com licença suspensa", () => {
    const totem = toTotemConfigFromCloudApi({
      ...cloudRow,
      license_status: "suspended",
      license_type: "monthly",
      plan_slug: "ecp-standard",
      license_expires_at: "2027-01-01T00:00:00Z",
      max_transactions_month: 5000,
    });
    expect(totem.is_active).toBe(true);
    expect(totem.license_id).toBe("lic-1");
    expect(totem.license_status).toBe("suspended");
    expect(totem.license_type).toBe("monthly");
    expect(totem.plan_slug).toBe("ecp-standard");
    expect(totem.license_expires_at).toBe("2027-01-01T00:00:00Z");
    expect(totem.max_transactions_month).toBe(5000);
  });

  it("mantém is_active sem license_status", () => {
    const totem = toTotemConfigFromCloudApi({ ...cloudRow, license_status: null });
    expect(totem.is_active).toBe(true);
    expect(totem.license_id).toBe("lic-1");
  });
});

describe("toTotemCloudApiBody — voucher (legado 1.3.12, CAMPOS_TOTEM)", () => {
  it("leva payment_voucher_enabled e payment_voucher_kind", () => {
    const body = toTotemCloudApiBody({ ...TOTEM_FORM_DEFAULTS, totem_name: "TOTEM-001", payment_voucher_enabled: true, payment_voucher_kind: "food" });
    expect(body.payment_voucher_enabled).toBe(true);
    expect(body.payment_voucher_kind).toBe("food");
  });

  it("totem novo nasce com voucher desligado e tipo Vale Refeição", () => {
    expect(TOTEM_FORM_DEFAULTS.payment_voucher_enabled).toBe(false);
    expect(TOTEM_FORM_DEFAULTS.payment_voucher_kind).toBe("meal");
  });
});
