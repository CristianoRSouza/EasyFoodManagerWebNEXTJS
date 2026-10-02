import { toPixnopdvPutBody, toPixnopdvStoreCredentials } from "./pixnopdv-mapper";

describe("toPixnopdvStoreCredentials", () => {
  it("traduz o formato de fio para camelCase", () => {
    expect(
      toPixnopdvStoreCredentials({
        store_id: "s1",
        environment: "producao",
        api_base_url: "https://x",
        basic_user: "u",
        basic_token_set: true,
        secret_key_set: true,
        insecure_tls: true,
        enabled: false,
        updated_at: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({
      storeId: "s1",
      environment: "producao",
      apiBaseUrl: "https://x",
      basicUser: "u",
      basicTokenSet: true,
      secretKeySet: true,
      insecureTls: true,
      enabled: false,
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("nunca lê valor de segredo: flags só são true quando a API diz true", () => {
    const creds = toPixnopdvStoreCredentials({ basic_token: "segredo", secret_key: "segredo", basic_token_set: "true" });
    expect(creds?.basicTokenSet).toBe(false);
    expect(creds?.secretKeySet).toBe(false);
    expect(JSON.stringify(creds)).not.toContain("segredo");
  });

  it("sem objeto na resposta vira null; campos ausentes usam os defaults da API (enabled=true)", () => {
    expect(toPixnopdvStoreCredentials(null)).toBeNull();
    expect(toPixnopdvStoreCredentials(undefined)).toBeNull();
    expect(toPixnopdvStoreCredentials({})).toMatchObject({ enabled: true, insecureTls: false, apiBaseUrl: null });
  });
});

describe("toPixnopdvPutBody", () => {
  it("omite o que está ausente (mantém o gravado) e manda null explícito (apaga)", () => {
    expect(toPixnopdvPutBody({ enabled: false })).toEqual({ enabled: false });
    expect(toPixnopdvPutBody({ basicToken: null, secretKey: undefined })).toEqual({ basic_token: null });
  });

  it("traduz todos os campos para snake_case", () => {
    expect(
      toPixnopdvPutBody({ apiBaseUrl: "a", basicUser: "b", basicToken: "c", secretKey: "d", insecureTls: true, enabled: true }),
    ).toEqual({ api_base_url: "a", basic_user: "b", basic_token: "c", secret_key: "d", insecure_tls: true, enabled: true });
  });
});
