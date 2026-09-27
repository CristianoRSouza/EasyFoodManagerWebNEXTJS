// @vitest-environment node
import { LanSessionGateway } from "./lan-session-gateway";
import type { ServerConfig } from "../config";

const config: ServerConfig = {
  backend: "lan",
  apiUrl: "http://api.loja",
  apiDisplayOrigin: "api.loja",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const farFuture = Math.floor(Date.now() / 1000) + 3600;
const jwt = `${encode({ alg: "HS256" })}.${encode({ sub: "u1", email: "a@loja.dev", exp: farFuture })}.sig`;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("LanSessionGateway", () => {
  it("login guarda o JWT num cookie httpOnly e devolve o usuário", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { access_token: jwt, token_type: "Bearer", expires_in: 28800 }));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });

    expect(fetchFn).toHaveBeenCalledWith("http://api.loja/v1/auth/login", expect.objectContaining({ method: "POST" }));
    expect(result).toEqual({
      ok: true,
      data: { id: "u1", email: "a@loja.dev" },
      setCookies: [`efm_session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`],
    });
  });

  it("login recusado devolve o erro normalizado sem cookie", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "Senha local ainda não definida.", error_code: "local_password_not_set" }));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: { code: "local_password_not_set", message: "Senha local ainda não definida." },
      setCookies: [],
    });
  });

  it("API fora do ar vira 503 backend_unreachable com mensagem em PT-BR", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      error: { code: "backend_unreachable", message: "Não foi possível contactar api.loja. Verifique o serviço e tente novamente." },
    });
  });

  it("currentUser lê o cookie; token vencido não é sessão", async () => {
    const gateway = new LanSessionGateway(config, vi.fn());
    expect(await gateway.currentUser(`efm_session=${jwt}`)).toEqual({ id: "u1", email: "a@loja.dev" });
    const expired = `${encode({ alg: "HS256" })}.${encode({ sub: "u1", email: "a", exp: 1 })}.sig`;
    expect(await gateway.currentUser(`efm_session=${expired}`)).toBeNull();
    expect(await gateway.currentUser(null)).toBeNull();
  });

  it("cookie malformado é ausência de sessão, não erro", async () => {
    const gateway = new LanSessionGateway(config, vi.fn());
    expect(await gateway.currentUser("efm_session=%")).toBeNull();
  });

  it("logout apaga o cookie sem chamar a API", async () => {
    const fetchFn = vi.fn();
    expect(await new LanSessionGateway(config, fetchFn).logout(`efm_session=${jwt}`)).toEqual([
      "efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    ]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("primeiro acesso envia o corpo no formato da API", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const result = await new LanSessionGateway(config, fetchFn).firstAccess({
      email: "a@loja.dev",
      newPassword: "segredo1",
      provisioningCode: "COD",
    });
    expect(result).toEqual({ ok: true, data: null, setCookies: [] });
    const [, init] = fetchFn.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ email: "a@loja.dev", new_password: "segredo1", provisioning_code: "COD" });
  });

  it("repasse troca o cookie por Bearer e não repassa cabeçalhos de tenant", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, [{ id: "p1" }]));
    const headers = new Headers({ accept: "application/json", "x-company-id": "c1", "x-store-id": "s1", cookie: "outro=1" });
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "?page=1", headers, body: null, cookieHeader: `efm_session=${jwt}`,
    });

    const [url, init] = fetchFn.mock.calls[0]!;
    const sent = new Headers(init.headers);
    expect(url).toBe("http://api.loja/v1/products?page=1");
    expect(sent.get("authorization")).toBe(`Bearer ${jwt}`);
    expect(sent.get("x-company-id")).toBeNull();
    expect(sent.get("cookie")).toBeNull();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "p1" }]);
  });

  it("repasse sem sessão responde 401 sem chamar a API", async () => {
    const fetchFn = vi.fn();
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: null,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("repasse sem cookie de sessão não manda apagar cookie nenhum", async () => {
    const response = await new LanSessionGateway(config, vi.fn()).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: "outro=1",
    });
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("repasse com JWT vencido responde 401 sem chamar a API e apaga o cookie", async () => {
    const fetchFn = vi.fn();
    const expired = `${encode({ alg: "HS256" })}.${encode({ sub: "u1", email: "a@loja.dev", exp: 1 })}.sig`;
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${expired}`,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("repasse de 429 preserva o retry-after", async () => {
    const backend = new Response(JSON.stringify({ error: "Muitas requisições." }), { status: 429, headers: { "retry-after": "5" } });
    const response = await new LanSessionGateway(config, vi.fn().mockResolvedValue(backend)).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${jwt}`,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("401 da API no repasse apaga o cookie", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "Token inválido.", error_code: "invalid_token" }));
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${jwt}`,
    });
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"]);
    expect(await response.json()).toEqual({ code: "invalid_token", message: "Token inválido." });
  });

  it("nenhuma resposta ao navegador carrega o token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/site-identity", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${jwt}`,
    });
    const text = await response.text();
    expect(text).not.toContain(jwt);
    expect([...response.headers.values()].join(" ")).not.toContain(jwt);
  });
});
