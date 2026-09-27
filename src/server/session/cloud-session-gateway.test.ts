// @vitest-environment node
import { CloudSessionGateway } from "./cloud-session-gateway";
import type { ServerConfig } from "../config";

const config: ServerConfig = {
  backend: "cloud",
  apiUrl: "http://api.nuvem",
  apiDisplayOrigin: "api.nuvem",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};
const json = (status: number, body: unknown, setCookie?: string) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
};

describe("CloudSessionGateway", () => {
  it("login retransmite o cookie da EasyFoodAPI", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      json(200, { user: { id: "u1", email: "a@b.com" } }, "efa_session=xyz; Path=/; HttpOnly; SameSite=Lax"),
    );
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: " a@b.com ", password: "x" });
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/auth/login");
    expect(JSON.parse(fetchFn.mock.calls[0]![1].body)).toEqual({ email: "a@b.com", password: "x" });
    expect(result).toEqual({
      ok: true,
      data: { id: "u1", email: "a@b.com" },
      setCookies: ["efa_session=xyz; Path=/; HttpOnly; SameSite=Lax"],
    });
  });

  it("login 401 vira a mensagem do legado", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "invalid_credentials", message: "x" }));
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a", password: "b" });
    expect(result).toMatchObject({ ok: false, status: 401, error: { code: "invalid_credentials", message: "Email ou senha incorretos." } });
  });

  it("login 429 vira a mensagem do legado", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(429, { error: "rate_limited" }));
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a", password: "b" });
    expect(result).toMatchObject({ status: 429, error: { message: "Muitas tentativas. Aguarde um momento e tente novamente." } });
  });

  it("currentUser consulta /auth/me com o cookie do navegador", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { id: "u1", email: "a@b.com" }));
    const user = await new CloudSessionGateway(config, fetchFn).currentUser("efa_session=xyz");
    expect(user).toEqual({ id: "u1", email: "a@b.com" });
    expect(new Headers(fetchFn.mock.calls[0]![1].headers).get("cookie")).toBe("efa_session=xyz");
  });

  it("currentUser sem cookie não chama a API; 401 é ausência de sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "unauthenticated" }));
    const gateway = new CloudSessionGateway(config, fetchFn);
    expect(await gateway.currentUser(null)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await gateway.currentUser("efa_session=velho")).toBeNull();
  });

  it("logout chama a API e retransmite o cookie que apaga a sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": "efa_session=; Max-Age=0; Path=/" } }));
    expect(await new CloudSessionGateway(config, fetchFn).logout("efa_session=xyz")).toEqual(["efa_session=; Max-Age=0; Path=/"]);
  });

  it("primeiro acesso não existe na nuvem", async () => {
    const result = await new CloudSessionGateway(config, vi.fn()).firstAccess({ email: "a", newPassword: "b" });
    expect(result).toMatchObject({ ok: false, status: 404, error: { code: "feature_unavailable" } });
  });

  it("repasse leva cookie e tenant, e devolve o Set-Cookie de renovação", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }, "efa_session=novo; Path=/; HttpOnly"));
    const headers = new Headers({ "x-company-id": "c1", "x-store-id": "s1", authorization: "Bearer intruso" });
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/me/stores", search: "", headers, body: null, cookieHeader: "efa_session=xyz",
    });
    const sent = new Headers(fetchFn.mock.calls[0]![1].headers);
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/me/stores");
    expect(sent.get("cookie")).toBe("efa_session=xyz");
    expect(sent.get("x-company-id")).toBe("c1");
    expect(sent.get("x-store-id")).toBe("s1");
    expect(sent.get("authorization")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["efa_session=novo; Path=/; HttpOnly"]);
  });

  it("repasse mantém content-type e content-disposition de downloads", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([80, 75]), {
        status: 200,
        headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="notas.zip"' },
      }),
    );
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/nfce/notes-xml", search: "", headers: new Headers(), body: null, cookieHeader: "efa_session=xyz",
    });
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="notas.zip"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([80, 75]));
  });
});
