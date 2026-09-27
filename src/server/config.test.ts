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
    });
  });

  it("usa cookie Secure em produção", () => {
    const config = readServerConfig({ BACKEND: "cloud", EASYFOOD_API_URL: "https://api.exemplo.com", NODE_ENV: "production" });
    expect(config.secureCookies).toBe(true);
  });

  it("aceita o endereço do EasyBilling configurado, sem barra final", () => {
    const config = readServerConfig({
      BACKEND: "cloud",
      EASYFOOD_API_URL: "http://localhost:3010",
      NEXT_PUBLIC_ADMIN_PLATFORM_URL: "https://billing.homolog.com/",
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
