// @vitest-environment node
import { backendUrl } from "./backend-url";
import type { ServerConfig } from "../config";

const base: Omit<ServerConfig, "backend"> = {
  apiUrl: "http://127.0.0.1:4080",
  apiDisplayOrigin: "127.0.0.1:4080",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};

describe("backendUrl", () => {
  it("modo loja: a API responde em /v1", () => {
    expect(backendUrl({ ...base, backend: "lan" }, "/v1/products", "?page=1")).toBe("http://127.0.0.1:4080/v1/products?page=1");
  });

  it("modo nuvem: a EasyFoodAPI responde sob /api/v1", () => {
    expect(backendUrl({ ...base, backend: "cloud" }, "/v1/me/stores")).toBe("http://127.0.0.1:4080/api/v1/me/stores");
  });
});
