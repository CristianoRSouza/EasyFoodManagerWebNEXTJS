// @vitest-environment node
import { readServerConfig } from "./config";

describe("readServerConfig", () => {
  it("lê o modo loja com a origem exibida no badge", () => {
    const config = readServerConfig({ BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4080/", NODE_ENV: "development" });
    expect(config).toEqual({
      backend: "lan",
      apiUrl: "http://127.0.0.1:4080",
      apiDisplayOrigin: "127.0.0.1:4080",
      adminPlatformUrl: "https://billing.easysoftcloud.com.br",
      secureCookies: false,
      ambiente: "producao",
      supabase: null,
    });
  });

  it("EASYFOOD_AMBIENTE=homolog liga a homologação; outro valor é produção (legado 1.3.12, PR #48)", () => {
    const base = { BACKEND: "cloud", EASYFOOD_API_URL: "http://localhost:3010", NODE_ENV: "test" as const };
    expect(readServerConfig({ ...base, EASYFOOD_AMBIENTE: "homolog" }).ambiente).toBe("homolog");
    expect(readServerConfig({ ...base, EASYFOOD_AMBIENTE: "staging" }).ambiente).toBe("producao");
  });

  it("Supabase do ambiente lido em execução, sem barra final; incompleto vira null", () => {
    const base = { BACKEND: "cloud", EASYFOOD_API_URL: "http://localhost:3010", NODE_ENV: "test" as const };
    expect(
      readServerConfig({ ...base, SUPABASE_URL: "https://homolog.example.test/", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" }).supabase,
    ).toEqual({ url: "https://homolog.example.test", publishableKey: "sb_publishable_x" });
    expect(readServerConfig({ ...base, SUPABASE_URL: "https://homolog.example.test" }).supabase).toBeNull();
    expect(readServerConfig({ ...base, SUPABASE_PUBLISHABLE_KEY: "k" }).supabase).toBeNull();
  });

  it("recusa SUPABASE_URL inválida", () => {
    expect(() =>
      readServerConfig({ BACKEND: "cloud", EASYFOOD_API_URL: "http://x", NODE_ENV: "test", SUPABASE_URL: "nao-e-url", SUPABASE_PUBLISHABLE_KEY: "k" }),
    ).toThrow(/SUPABASE_URL/);
  });

  it("sem SESSION_COOKIE_SECURE, cookie Secure só em produção", () => {
    const base = { BACKEND: "cloud", EASYFOOD_API_URL: "https://api.exemplo.com" };
    expect(readServerConfig({ ...base, NODE_ENV: "production" }).secureCookies).toBe(true);
    expect(readServerConfig({ ...base, NODE_ENV: "development" }).secureCookies).toBe(false);
  });

  it("SESSION_COOKIE_SECURE=false desliga o Secure mesmo em produção (loja em HTTP puro)", () => {
    const config = readServerConfig({
      BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4080", NODE_ENV: "production", SESSION_COOKIE_SECURE: "false",
    });
    expect(config.secureCookies).toBe(false);
  });

  it("SESSION_COOKIE_SECURE=true liga o Secure mesmo em desenvolvimento", () => {
    const config = readServerConfig({
      BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4080", NODE_ENV: "development", SESSION_COOKIE_SECURE: "true",
    });
    expect(config.secureCookies).toBe(true);
  });

  it("recusa SESSION_COOKIE_SECURE fora de true/false", () => {
    expect(() =>
      readServerConfig({ BACKEND: "lan", EASYFOOD_API_URL: "http://x", NODE_ENV: "test", SESSION_COOKIE_SECURE: "sim" }),
    ).toThrow(/SESSION_COOKIE_SECURE/);
  });

  it("aceita o endereço do EasyBilling configurado, sem barra final", () => {
    const config = readServerConfig({
      BACKEND: "cloud",
      EASYFOOD_API_URL: "http://localhost:3010",
      ADMIN_PLATFORM_URL: "https://billing.homolog.com/",
      NODE_ENV: "test",
    });
    expect(config.adminPlatformUrl).toBe("https://billing.homolog.com");
  });

  it("recusa BACKEND ausente ou desconhecido com mensagem clara", () => {
    expect(() => readServerConfig({ EASYFOOD_API_URL: "http://x", NODE_ENV: "test" })).toThrow(/BACKEND/);
    expect(() => readServerConfig({ BACKEND: "electron", EASYFOOD_API_URL: "http://x", NODE_ENV: "test" })).toThrow(/BACKEND/);
  });

  it("recusa EASYFOOD_API_URL inválida", () => {
    expect(() => readServerConfig({ BACKEND: "lan", EASYFOOD_API_URL: "localhost", NODE_ENV: "test" })).toThrow(/EASYFOOD_API_URL/);
  });
});
