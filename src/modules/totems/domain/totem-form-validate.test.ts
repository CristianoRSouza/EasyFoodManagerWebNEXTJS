import { describe, it, expect } from "vitest";
import { validateTotemForm, type TotemFormValidationContext } from "./totem-form-validate";
import { TOTEM_FORM_DEFAULTS } from "./totem-form";
import type { TotemConfigFormData } from "./totem-config";

const baseCtx: TotemFormValidationContext = {
  isEditing: false,
  existingNames: [],
  licenseIsDemo: false,
  licensePoolMode: false,
  selectedLicenseId: null,
};

function validForm(): TotemConfigFormData {
  return { ...TOTEM_FORM_DEFAULTS, totem_name: "TOTEM-001" };
}

describe("validateTotemForm", () => {
  it("formulário válido não tem erros", () => {
    expect(validateTotemForm(validForm(), baseCtx)).toEqual({});
  });

  it("nome obrigatório", () => {
    const errs = validateTotemForm({ ...validForm(), totem_name: "" }, baseCtx);
    expect(errs.totem_name).toBe("Nome é obrigatório");
  });

  it("nome fora do padrão A-Z0-9-", () => {
    const errs = validateTotemForm({ ...validForm(), totem_name: "totem 1" }, baseCtx);
    expect(errs.totem_name).toMatch(/A-Z, 0-9 e hífen/);
  });

  it("nome duplicado só bloqueia cadastro novo", () => {
    const ctx = { ...baseCtx, existingNames: ["TOTEM-001"] };
    expect(validateTotemForm(validForm(), ctx).totem_name).toMatch(/Já existe/);
    expect(validateTotemForm(validForm(), { ...ctx, isEditing: true }).totem_name).toBeUndefined();
  });

  it("licença Demo bloqueia app_mode produção", () => {
    const errs = validateTotemForm({ ...validForm(), app_mode: "producao" }, { ...baseCtx, licenseIsDemo: true });
    expect(errs.app_mode).toMatch(/Licença Demo/);
  });

  it("ativo sem licença vinculada em edição com pool -> erro de licença", () => {
    const errs = validateTotemForm(
      { ...validForm(), is_active: true },
      { ...baseCtx, isEditing: true, licensePoolMode: true, selectedLicenseId: null },
    );
    expect(errs.license).toMatch(/Vincule uma licença/);
  });

  it("nfce_service_url inválida", () => {
    const errs = validateTotemForm({ ...validForm(), nfce_service_url: "não-é-url" }, baseCtx);
    expect(errs.nfce_service_url).toBeDefined();
  });

  it("timeout fora da faixa", () => {
    expect(validateTotemForm({ ...validForm(), nfce_emit_timeout_ms: 1000 }, baseCtx).nfce_emit_timeout_ms).toBeDefined();
    expect(validateTotemForm({ ...validForm(), nfce_emit_timeout_ms: 400000 }, baseCtx).nfce_emit_timeout_ms).toBeDefined();
  });

  it("série fora de 1-999", () => {
    expect(validateTotemForm({ ...validForm(), nfce_serie: 0 }, baseCtx).nfce_serie).toBeDefined();
    expect(validateTotemForm({ ...validForm(), nfce_serie: 1000 }, baseCtx).nfce_serie).toBeDefined();
  });

  it("CNPJ com tamanho errado ou dígitos repetidos", () => {
    expect(validateTotemForm({ ...validForm(), establishment_cnpj: "123" }, baseCtx).establishment_cnpj).toBeDefined();
    expect(
      validateTotemForm({ ...validForm(), establishment_cnpj: "11111111111111" }, baseCtx).establishment_cnpj,
    ).toBeDefined();
  });

  it("application name obrigatório e limitado a 60", () => {
    expect(validateTotemForm({ ...validForm(), tef_application_name: "" }, baseCtx).tef_application_name).toBeDefined();
    expect(
      validateTotemForm({ ...validForm(), tef_application_name: "x".repeat(61) }, baseCtx).tef_application_name,
    ).toBeDefined();
  });

  it("application version no formato x.y.z", () => {
    expect(validateTotemForm({ ...validForm(), tef_application_version: "abc" }, baseCtx).tef_application_version).toBeDefined();
    expect(validateTotemForm({ ...validForm(), tef_application_version: "1.0.0" }, baseCtx).tef_application_version).toBeUndefined();
  });

  it("claim source statuses inválido", () => {
    expect(
      validateTotemForm({ ...validForm(), tef_claim_source_statuses: "PENDING" }, baseCtx).tef_claim_source_statuses,
    ).toBeDefined();
  });

  it("poll interval/max fora da faixa e max <= interval", () => {
    expect(validateTotemForm({ ...validForm(), tef_poll_interval_ms: 10 }, baseCtx).tef_poll_interval_ms).toBeDefined();
    expect(validateTotemForm({ ...validForm(), tef_poll_max_ms: 100 }, baseCtx).tef_poll_max_ms).toBeDefined();
    expect(
      validateTotemForm({ ...validForm(), tef_poll_interval_ms: 1000, tef_poll_max_ms: 1000 }, baseCtx).tef_poll_max_ms,
    ).toMatch(/maior que poll interval/);
  });

  it("image server host/port", () => {
    expect(validateTotemForm({ ...validForm(), image_server_host: "h".repeat(254) }, baseCtx).image_server_host).toBeDefined();
    expect(validateTotemForm({ ...validForm(), image_server_port: 99999 }, baseCtx).image_server_port).toBeDefined();
  });
});
