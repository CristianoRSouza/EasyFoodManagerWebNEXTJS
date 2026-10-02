import { buildIssuerUpdatePayload, draftFromConfig, ISSUER_SECRET_FIELDS } from "./issuer-edit-draft";
import type { NfceIssuerConfig } from "./nfce-issuer-config";

const CONFIG: NfceIssuerConfig = {
  id: "issuer-1",
  cnpj: "12345678000199",
  companyName: "Restaurante Exemplo Ltda",
  tradeName: "Exemplo Lanches",
  stateRegistration: "123456789",
  stateRegistrationSt: null,
  municipalRegistration: "987654",
  cnae: "5611203",
  taxRegimeCode: 1,
  phone: "11987654321",
  legacyLojaId: 7,
  pisCofinsRegimeCode: 1,
  street: "Rua das Flores",
  number: "100",
  complement: null,
  neighborhood: "Centro",
  municipalityCode: "3550308",
  municipalityName: "São Paulo",
  uf: "SP",
  zipCode: "01001000",
  countryCode: "1058",
  countryName: "Brasil",
  environment: 2,
  nfceSerie: 1,
  nfeSerie: null,
  nfceSecurityCode: "CSC123",
  nfceSecurityCodeId: "000001",
  isActive: true,
  notes: "Observação",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-10T10:00:00Z",
  infAdFbConfig250: null,
  infAdFbConfig251: null,
  aditumTefPartnerToken: null,
  aditumTefPartnerTokenEncryptedSet: true,
  aditumTefActivationCode: null,
  aditumTefActivationCodeEncryptedSet: false,
  issuerSensitiveSecretsReady: true,
  tefAdminHttpBaseUrl: "http://127.0.0.1:3090",
  tefAdminHttpApiKey: null,
  tefAdminHttpApiKeySet: false,
  companyIdEasyerp: "22222222-2222-4222-8222-222222222222",
  storeIdEasyerp: null,
  apikeyEasyerp: null,
  easyerpApiKeySet: true,
  easyerpApiKeyOrigem: null,
  certificateHolderName: null,
  certificateHolderCnpj: null,
  certificateAuthorityName: null,
  certificateSeries: null,
  certificateType: null,
  certificatePfxRelativePath: null,
  certificateSourcePath: null,
  certificateExportedAt: null,
  certificateValidUntil: null,
  cryptoLibraryFlag: null,
  certificateAccessFlag: null,
};

describe("draftFromConfig", () => {
  it("preenche o rascunho com as colunas snake_case da API, a partir do domínio camelCase", () => {
    const draft = draftFromConfig(CONFIG);
    expect(draft.cnpj).toBe("12345678000199");
    expect(draft.company_name).toBe("Restaurante Exemplo Ltda");
    expect(draft.tax_regime_code).toBe("1");
    expect(draft.environment).toBe("2");
    expect(draft.legacy_loja_id).toBe("7");
  });

  it("série NFC-e nula abre o campo vazio e, salva sem mexer, vai como null (o legado manda parseInt('null') = NaN → null), nunca 0", () => {
    const draft = draftFromConfig({ ...CONFIG, nfceSerie: null });
    expect(draft.nfce_serie).toBe("");
    expect(buildIssuerUpdatePayload(draft).nfce_serie).toBeNull();
  });

  it("regime tributário ausente vira campo vazio, não a palavra 'null'", () => {
    expect(draftFromConfig({ ...CONFIG, taxRegimeCode: null }).tax_regime_code).toBe("");
  });

  it("campo ausente (null) vira string vazia, não a palavra 'null'", () => {
    const draft = draftFromConfig(CONFIG);
    expect(draft.trade_name).toBe("Exemplo Lanches");
    expect(draft.complement).toBe("");
    expect(draft.nfe_serie).toBe("");
  });

  it("INVARIANTE 2 — os 5 campos de segredo sempre abrem em branco, mesmo que o domínio (por engano da API) trouxesse um valor", () => {
    const draft = draftFromConfig({ ...CONFIG, aditumTefPartnerToken: "VAZOU-EM-CLARO", apikeyEasyerp: "VAZOU-EM-CLARO", tefAdminHttpApiKey: "VAZOU-EM-CLARO" });
    expect(draft.aditum_tef_partner_token).toBe("");
    expect(draft.apikey_easyerp).toBe("");
    expect(draft.aditum_tef_activation_code).toBe("");
    expect(draft.certificate_password).toBe("");
    expect(draft.tef_admin_http_api_key).toBe("");
  });

  it("Importante 1 — tef_admin_http_api_key abre em branco mesmo quando a API manda o valor em claro (pendência: API ainda não remove a coluna)", () => {
    const draft = draftFromConfig({ ...CONFIG, tefAdminHttpApiKey: "chave-tef-em-claro" });
    expect(draft.tef_admin_http_api_key).toBe("");
  });

  it("nfce_security_code (CSC) continua pré-preenchido — não é segredo redigido (paridade com o legado, Importante 1: decisão do usuário)", () => {
    const draft = draftFromConfig(CONFIG);
    expect(draft.nfce_security_code).toBe("CSC123");
  });
});

describe("buildIssuerUpdatePayload", () => {
  it("campo de segredo em branco é OMITIDO do payload (nunca vira null) — não apaga o segredo já gravado", () => {
    const draft = draftFromConfig(CONFIG);
    const payload = buildIssuerUpdatePayload(draft);
    for (const field of ISSUER_SECRET_FIELDS) {
      expect(field in payload).toBe(false);
    }
  });

  it("campo de segredo preenchido é enviado como string, uma vez", () => {
    const draft = { ...draftFromConfig(CONFIG), apikey_easyerp: "nova-chave-123" };
    const payload = buildIssuerUpdatePayload(draft);
    expect(payload.apikey_easyerp).toBe("nova-chave-123");
  });

  it("campo numérico em branco vira null; preenchido vira inteiro", () => {
    const draft = draftFromConfig(CONFIG);
    draft.nfe_serie = "";
    draft.certificate_type = "3";
    const payload = buildIssuerUpdatePayload(draft);
    expect(payload.nfe_serie).toBeNull();
    expect(payload.certificate_type).toBe(3);
  });

  it("campo de texto comum em branco vira null; preenchido vira a string", () => {
    const draft = draftFromConfig(CONFIG);
    draft.complement = "";
    draft.trade_name = "Novo Nome";
    const payload = buildIssuerUpdatePayload(draft);
    expect(payload.complement).toBeNull();
    expect(payload.trade_name).toBe("Novo Nome");
  });

  it("valor só com espaços em um campo de segredo também é tratado como em branco (omitido)", () => {
    const draft = { ...draftFromConfig(CONFIG), aditum_tef_activation_code: "   " };
    const payload = buildIssuerUpdatePayload(draft);
    expect("aditum_tef_activation_code" in payload).toBe(false);
  });

  it("Importante 1 — tef_admin_http_api_key não digitado nunca é reenviado no PATCH", () => {
    const draft = draftFromConfig(CONFIG);
    const payload = buildIssuerUpdatePayload(draft);
    expect("tef_admin_http_api_key" in payload).toBe(false);
  });

  it("Importante 1 — tef_admin_http_api_key digitado de novo é enviado como string", () => {
    const draft = { ...draftFromConfig(CONFIG), tef_admin_http_api_key: "nova-chave-tef" };
    const payload = buildIssuerUpdatePayload(draft);
    expect(payload.tef_admin_http_api_key).toBe("nova-chave-tef");
  });
});
