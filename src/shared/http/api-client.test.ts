import { apiRequest } from "./api-client";
import { ApiError } from "./api-error";
import { SESSION_EXPIRED_EVENT } from "./session-events";
import { sessionClient } from "@/shared/session/session-client";

const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("chama o repasse do próprio Next com os cabeçalhos de tenant", async () => {
    const fetchSpy = reply(200, [{ id: "1" }]);
    const result = await apiRequest("/products", { tenant: { companyId: "c1", storeId: "s1" } });
    expect(result).toEqual([{ id: "1" }]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/v1/products");
    expect(new Headers(init!.headers).get("x-company-id")).toBe("c1");
    expect(new Headers(init!.headers).get("x-store-id")).toBe("s1");
    expect(init!.credentials).toBe("same-origin");
  });

  it("envia corpo JSON", async () => {
    const fetchSpy = reply(200, {});
    await apiRequest("/totems", { method: "POST", body: { a: 1 } });
    expect(fetchSpy.mock.calls[0]![1]!.body).toBe('{"a":1}');
    expect(new Headers(fetchSpy.mock.calls[0]![1]!.headers).get("content-type")).toBe("application/json");
  });

  it("204 devolve undefined", async () => {
    reply(204, undefined);
    await expect(apiRequest("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("erro vira ApiError com code e message do BFF", async () => {
    reply(403, { code: "tenant_forbidden", message: "Você não tem acesso a esta loja." });
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 403, code: "tenant_forbidden", message: "Você não tem acesso a esta loja." });
  });

  it("401 avisa que a sessão expirou", async () => {
    reply(401, { code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    await expect(apiRequest("/x")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("falha de rede vira ApiError network em PT-BR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 0, code: "network", message: "Não foi possível contactar o servidor." });
  });
});

describe("sessionClient", () => {
  it("login 401 é credencial errada, não sessão expirada", async () => {
    reply(401, { code: "invalid_credentials", message: "Email ou senha incorretos." });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    await expect(sessionClient.login("a", "b")).rejects.toMatchObject({ status: 401, message: "Email ou senha incorretos." });
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("currentUser devolve null em 401", async () => {
    reply(401, { code: "unauthenticated", message: "x" });
    await expect(sessionClient.currentUser()).resolves.toBeNull();
  });

  it("pedido de recuperação vai para a API com app=manager", async () => {
    const fetchSpy = reply(204, undefined);
    await sessionClient.requestPasswordReset(" a@b.com ");
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/v1/auth/recovery-email");
    expect(fetchSpy.mock.calls[0]![1]!.body).toBe('{"email":"a@b.com","app":"manager"}');
  });
});
