import { describe, it, expect } from "vitest";
import {
  TOTEM_FORM_DEFAULTS,
  chaveRedigida,
  isNfceHttpUrl,
  isAditumRuntimeUrl,
  isCnpjAllSameDigit,
  sanitizePlainText,
  mapErrorsToTabs,
  buildTotemSubmitPayload,
  computeTotemNameStatus,
  omit,
  voucherChangeNotPersisted,
  VOUCHER_NOT_PERSISTED_TOAST,
} from "./totem-form";
import type { TotemConfig, TotemConfigFormData } from "./totem-config";

function validForm(): TotemConfigFormData {
  return { ...TOTEM_FORM_DEFAULTS, totem_name: "TOTEM-001" };
}

describe("chaveRedigida", () => {
  it("gravada=true e valor vazio -> true", () => expect(chaveRedigida("", true)).toBe(true));
  it("gravada=true e valor preenchido -> false", () => expect(chaveRedigida("abc", true)).toBe(false));
  it("gravada ausente -> false", () => expect(chaveRedigida("", undefined)).toBe(false));
});

describe("isNfceHttpUrl", () => {
  it("aceita http/https com host", () => {
    expect(isNfceHttpUrl("http://127.0.0.1:3002")).toBe(true);
    expect(isNfceHttpUrl("https://exemplo.com")).toBe(true);
  });
  it("rejeita protocolo diferente ou inválido", () => {
    expect(isNfceHttpUrl("ftp://x")).toBe(false);
    expect(isNfceHttpUrl("não-é-url")).toBe(false);
  });
});

describe("isAditumRuntimeUrl", () => {
  it("https sempre ok", () => {
    expect(isAditumRuntimeUrl("https://qualquer-host:4090").ok).toBe(true);
  });
  it("http só em loopback", () => {
    expect(isAditumRuntimeUrl("http://localhost:4090").ok).toBe(true);
    expect(isAditumRuntimeUrl("http://127.0.0.1:4090").ok).toBe(true);
    expect(isAditumRuntimeUrl("http://192.168.0.10:4090")).toEqual({
      ok: false,
      reason: "http:// só é permitido em localhost/127.0.0.1",
    });
  });
  it("URL inválida", () => {
    expect(isAditumRuntimeUrl("não-é-url").ok).toBe(false);
  });
});

describe("isCnpjAllSameDigit", () => {
  it("detecta sequência única", () => expect(isCnpjAllSameDigit("11111111111111")).toBe(true));
  it("cnpj normal -> false", () => expect(isCnpjAllSameDigit("13971933000178")).toBe(false));
});

describe("sanitizePlainText", () => {
  it("remove caracteres de controle (inclusive tab) e colapsa espaços", () => {
    // \t está no intervalo \u0000-\u001F removido pela mesma regex — some, não vira espaço.
    expect(sanitizePlainText("a\u0000b   c\td")).toBe("ab cd");
  });
  it("colapsa múltiplos espaços em um só", () => {
    expect(sanitizePlainText("a   b")).toBe("a b");
  });
});

describe("computeTotemNameStatus", () => {
  it("vazio -> null", () => expect(computeTotemNameStatus("", false, [])).toBeNull());
  it("inválido -> invalid", () => expect(computeTotemNameStatus("totem 1", false, [])).toBe("invalid"));
  it("duplicado (cadastro novo) -> duplicate", () => {
    expect(computeTotemNameStatus("TOTEM-1", false, ["TOTEM-1"])).toBe("duplicate");
  });
  it("duplicado mas em edição -> valid (não bloqueia o próprio nome)", () => {
    expect(computeTotemNameStatus("TOTEM-1", true, ["TOTEM-1"])).toBe("valid");
  });
  it("válido -> valid", () => expect(computeTotemNameStatus("TOTEM-1", false, [])).toBe("valid"));
});

// validateTotemForm tem arquivo próprio: ./totem-form-validate.test.ts (mantém este arquivo <300 linhas).

describe("omit", () => {
  it("remove só as chaves pedidas", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });
  it("objeto sem as chaves -> cópia inalterada", () => {
    expect(omit({ a: 1, b: 2 }, [])).toEqual({ a: 1, b: 2 });
  });
});

describe("mapErrorsToTabs", () => {
  it("mapeia cada campo para a aba certa", () => {
    expect(mapErrorsToTabs({ totem_name: "x" }).geral).toBe(true);
    expect(mapErrorsToTabs({ license: "x" }).licenca).toBe(true);
    expect(mapErrorsToTabs({ nfce_serie: "x" }).nfce).toBe(true);
    expect(mapErrorsToTabs({ image_server_port: "x" }).nfce).toBe(true);
    expect(mapErrorsToTabs({ pix_http_base_url: "x" }).pix).toBe(true);
    expect(mapErrorsToTabs({ tef_http_base_url: "x" }).tef).toBe(true);
    expect(mapErrorsToTabs({ tef_base_url: "x" }).aditum).toBe(true);
  });
  it("sem erros -> todas false", () => {
    const tabs = mapErrorsToTabs({});
    expect(Object.values(tabs).every((v) => v === false)).toBe(true);
  });
});

describe("buildTotemSubmitPayload", () => {
  it("licença Demo força não-produção nos 3 campos", () => {
    const form: TotemConfigFormData = {
      ...validForm(),
      app_mode: "producao",
      payment_environment: "producao",
      nfce_environment: 1,
    };
    const payload = buildTotemSubmitPayload(form, { isEditing: false, licenseIsDemo: true });
    expect(payload.app_mode).toBe("homologacao");
    expect(payload.payment_environment).toBe("homologacao");
    expect(payload.nfce_environment).toBe(2);
  });

  it("INVARIANTE: segredo Aditum em branco na edição não é enviado (omitido, não apagado)", () => {
    const form: TotemConfigFormData = {
      ...validForm(),
      aditum_partner_token: "",
      aditum_partner_token_encrypted_set: true,
      aditum_activation_code: "  ",
      aditum_activation_code_encrypted_set: true,
    };
    const payload = buildTotemSubmitPayload(form, { isEditing: true, licenseIsDemo: false });
    expect(payload.aditum_partner_token).toBeUndefined();
    expect(payload.aditum_activation_code).toBeUndefined();
  });

  it("segredo Aditum preenchido é enviado normalmente", () => {
    const form: TotemConfigFormData = {
      ...validForm(),
      aditum_partner_token: "novo-token",
      aditum_partner_token_encrypted_set: true,
    };
    const payload = buildTotemSubmitPayload(form, { isEditing: true, licenseIsDemo: false });
    expect(payload.aditum_partner_token).toBe("novo-token");
  });

  it("cadastro novo (isEditing=false) nunca omite, mesmo com _set true", () => {
    const form: TotemConfigFormData = {
      ...validForm(),
      aditum_partner_token: "",
      aditum_partner_token_encrypted_set: true,
    };
    const payload = buildTotemSubmitPayload(form, { isEditing: false, licenseIsDemo: false });
    expect(payload.aditum_partner_token).toBe("");
  });
});

describe("voucherChangeNotPersisted (desvio deliberado: aviso extra no lugar do 'Erro ao salvar' do legado)", () => {
  const semColunas = { id: "t1", totem_name: "T" } as unknown as TotemConfig;
  const comColunas = { ...semColunas, payment_voucher_enabled: false, payment_voucher_kind: "meal" } as TotemConfig;
  const form = (v: Partial<TotemConfigFormData>): TotemConfigFormData => ({ ...validForm(), ...v });

  it("API sem colunas de voucher + usuário ligou o voucher → avisa", () => {
    expect(voucherChangeNotPersisted(semColunas, form({ payment_voucher_enabled: true }))).toBe(true);
  });

  it("API sem colunas de voucher + usuário trocou só o tipo → avisa", () => {
    expect(voucherChangeNotPersisted(semColunas, form({ payment_voucher_kind: "food" }))).toBe(true);
  });

  it("API sem colunas de voucher + voucher intocado (padrões false/meal) → não avisa", () => {
    expect(voucherChangeNotPersisted(semColunas, form({}))).toBe(false);
  });

  it("API com colunas de voucher → nunca avisa, mesmo mudando o voucher", () => {
    expect(voucherChangeNotPersisted(comColunas, form({ payment_voucher_enabled: true, payment_voucher_kind: "food" }))).toBe(false);
  });

  it("basta UMA das colunas faltar para o voucher não ser gravado", () => {
    const soEnabled = { ...semColunas, payment_voucher_enabled: false } as TotemConfig;
    expect(voucherChangeNotPersisted(soEnabled, form({ payment_voucher_enabled: true }))).toBe(true);
  });

  it("texto do aviso (PT-BR, título + descrição como os toasts do legado)", () => {
    expect(`${VOUCHER_NOT_PERSISTED_TOAST.title}: ${VOUCHER_NOT_PERSISTED_TOAST.description.charAt(0).toLowerCase()}${VOUCHER_NOT_PERSISTED_TOAST.description.slice(1)}`).toBe(
      "Configuração de voucher não gravada: a API desta loja ainda não suporta voucher.",
    );
  });
});
