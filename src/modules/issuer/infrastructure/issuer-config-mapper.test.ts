import { toNfceAcbrConfig, toNfceIssuerConfig } from "./issuer-config-mapper";

const BASE_ROW = {
  id: "issuer-1",
  cnpj: "12345678000199",
  company_name: "Restaurante Exemplo Ltda",
  trade_name: "Exemplo Lanches",
  state_registration: "123456789",
  state_registration_st: null,
  municipal_registration: "987654",
  cnae: "5611203",
  tax_regime_code: 1,
  phone: "11987654321",
  legacy_loja_id: 7,
  pis_cofins_regime_code: 1,
  street: "Rua das Flores",
  number: "100",
  complement: null,
  neighborhood: "Centro",
  municipality_code: "3550308",
  municipality_name: "São Paulo",
  uf: "SP",
  zip_code: "01001000",
  country_code: "1058",
  country_name: "Brasil",
  environment: 2,
  nfce_serie: 1,
  nfe_serie: null,
  nfce_security_code: "CSC123",
  nfce_security_code_id: "000001",
  is_active: true,
  notes: "Observação de teste",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-10T10:00:00Z",
  inf_ad_fb_config_250: null,
  inf_ad_fb_config_251: null,
  aditum_tef_partner_token_encrypted_set: false,
  aditum_tef_activation_code_encrypted_set: false,
  issuer_sensitive_secrets_ready: true,
  tef_admin_http_base_url: null,
  tef_admin_http_api_key: null,
  companyid_easyerp: null,
  storeid_easyerp: null,
  easyerp_api_key_set: false,
  certificate_holder_name: null,
  certificate_holder_cnpj: null,
  certificate_authority_name: null,
  certificate_series: null,
  certificate_type: null,
  certificate_pfx_relative_path: null,
  certificate_source_path: null,
  certificate_exported_at: null,
  certificate_valid_until: null,
  crypto_library_flag: null,
  certificate_access_flag: null,
};

describe("toNfceIssuerConfig", () => {
  it("converte a linha da API (snake_case) para o domínio (camelCase)", () => {
    const config = toNfceIssuerConfig(BASE_ROW);
    expect(config).toMatchObject({
      id: "issuer-1",
      cnpj: "12345678000199",
      companyName: "Restaurante Exemplo Ltda",
      tradeName: "Exemplo Lanches",
      taxRegimeCode: 1,
      environment: 2,
      nfceSerie: 1,
      nfeSerie: null,
      isActive: true,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-10T10:00:00Z",
    });
  });

  it("campos numéricos como texto (Postgres numeric) são convertidos", () => {
    const config = toNfceIssuerConfig({ ...BASE_ROW, tax_regime_code: "3", nfce_serie: "2", legacy_loja_id: "42" });
    expect(config.taxRegimeCode).toBe(3);
    expect(config.nfceSerie).toBe(2);
    expect(config.legacyLojaId).toBe(42);
  });

  it("série NFC-e nula (visto na produção) fica nula — não vira 0", () => {
    expect(toNfceIssuerConfig({ ...BASE_ROW, nfce_serie: null }).nfceSerie).toBeNull();
  });

  it("campos obrigatórios ausentes caem em string vazia (rede de segurança, não NaN/undefined)", () => {
    const config = toNfceIssuerConfig({ id: "x" });
    expect(config.cnpj).toBe("");
    expect(config.companyName).toBe("");
    expect(config.street).toBe("");
    // Regime ausente fica ausente: a tela mostra "—", não "Regime Normal" (legado 1.3.12, PR #35).
    expect(config.taxRegimeCode).toBeNull();
    expect(config.isActive).toBe(false);
  });

  it("nunca inventa um segredo: campo ausente na linha vira null, não uma string vazia mascarada", () => {
    const config = toNfceIssuerConfig(BASE_ROW);
    expect(config.aditumTefPartnerToken).toBeNull();
    expect(config.aditumTefActivationCode).toBeNull();
    expect(config.apikeyEasyerp).toBeNull();
  });

  it("repassa o segredo em claro só se a linha realmente trouxer (a API normal nunca traz) — a UI é quem nunca exibe", () => {
    // Defesa em profundidade: se um dia a API vazar o valor por engano, o mapper não some com ele
    // silenciosamente (perderíamos o sinal de bug); quem garante a invariante 2 é a UI (ver
    // IssuerTefCard/IssuerEasyerpCard), nunca este mapper.
    const config = toNfceIssuerConfig({ ...BASE_ROW, aditum_tef_partner_token: "TOKEN-EM-CLARO" });
    expect(config.aditumTefPartnerToken).toBe("TOKEN-EM-CLARO");
  });

  it("flags booleanas de segredo cifrado", () => {
    const config = toNfceIssuerConfig({
      ...BASE_ROW,
      aditum_tef_partner_token_encrypted_set: true,
      easyerp_api_key_set: true,
      issuer_sensitive_secrets_ready: false,
    });
    expect(config.aditumTefPartnerTokenEncryptedSet).toBe(true);
    expect(config.easyerpApiKeySet).toBe(true);
    expect(config.issuerSensitiveSecretsReady).toBe(false);
  });
});

describe("toNfceIssuerConfig — campos da nuvem (legado 1.3.12, PRs #37/#38)", () => {
  it("X-Api-Key TEF e origem da chave EasyERP", () => {
    const config = toNfceIssuerConfig({ ...BASE_ROW, tef_admin_http_api_key_set: true, easyerp_api_key_origem: "loja" });
    expect(config.tefAdminHttpApiKeySet).toBe(true);
    expect(config.easyerpApiKeyOrigem).toBe("loja");
  });

  it("origem desconhecida ou ausente vira null; flag ausente vira false", () => {
    expect(toNfceIssuerConfig({ ...BASE_ROW, easyerp_api_key_origem: "outra" }).easyerpApiKeyOrigem).toBeNull();
    expect(toNfceIssuerConfig(BASE_ROW).easyerpApiKeyOrigem).toBeNull();
    expect(toNfceIssuerConfig(BASE_ROW).tefAdminHttpApiKeySet).toBe(false);
  });

  it("issuer_sensitive_secrets_ready ausente é null — o aviso de chave só aparece com false explícito", () => {
    const semFlag: Record<string, unknown> = { ...BASE_ROW };
    delete semFlag.issuer_sensitive_secrets_ready;
    expect(toNfceIssuerConfig(semFlag).issuerSensitiveSecretsReady).toBeNull();
  });
});

describe("toNfceAcbrConfig", () => {
  it("converte a linha do ACBrLib", () => {
    const config = toNfceAcbrConfig({
      id: "acbr-1",
      key: "ChaveCSC",
      value: "abc123",
      description: "Código de segurança do contribuinte",
      updated_at: "2026-01-05T10:00:00Z",
    });
    expect(config).toEqual({
      id: "acbr-1",
      key: "ChaveCSC",
      value: "abc123",
      description: "Código de segurança do contribuinte",
      updatedAt: "2026-01-05T10:00:00Z",
    });
  });

  it("descrição ausente vira null", () => {
    const config = toNfceAcbrConfig({ id: "acbr-2", key: "K", value: "v", description: null, updated_at: "2026-01-05T10:00:00Z" });
    expect(config.description).toBeNull();
  });
});
