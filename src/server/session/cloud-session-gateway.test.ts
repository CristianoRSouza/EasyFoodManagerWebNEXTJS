// @vitest-environment node
import { CloudSessionGateway } from "./cloud-session-gateway";
import type { ServerConfig } from "../config";

const config: ServerConfig = {
  backend: "cloud",
  apiUrl: "http://api.nuvem",
  apiDisplayOrigin: "api.nuvem",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
  ambiente: "producao",
  supabase: null,
};
const json = (status: number, body: unknown, setCookie?: string) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
};

describe("CloudSessionGateway", () => {
  it("login retransmite o cookie da EasyFoodAPI", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      json(200, { user: { id: "u1", email: "a@b.com" } }, "easyfood_session=xyz; Path=/; HttpOnly; SameSite=Lax"),
    );
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: " a@b.com ", password: "x" });
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/auth/login");
    expect(JSON.parse(fetchFn.mock.calls[0]![1].body)).toEqual({ email: "a@b.com", password: "x" });
    expect(result).toEqual({
      ok: true,
      data: { id: "u1", email: "a@b.com" },
      setCookies: ["easyfood_session=xyz; Path=/; HttpOnly; SameSite=Lax"],
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
    const user = await new CloudSessionGateway(config, fetchFn).currentUser("easyfood_session=xyz");
    expect(user).toEqual({ id: "u1", email: "a@b.com" });
    expect(new Headers(fetchFn.mock.calls[0]![1].headers).get("cookie")).toBe("easyfood_session=xyz");
  });

  it("currentUser sem cookie não chama a API; 401 é ausência de sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "unauthenticated" }));
    const gateway = new CloudSessionGateway(config, fetchFn);
    expect(await gateway.currentUser(null)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await gateway.currentUser("easyfood_session=velho")).toBeNull();
  });

  it("verifiedUser é o /auth/me: a EasyFoodAPI valida a sessão; recusada ou fora do ar é ausência", async () => {
    const ok = vi.fn().mockResolvedValue(json(200, { id: "u1", email: "a@b.com" }));
    expect(await new CloudSessionGateway(config, ok).verifiedUser("easyfood_session=xyz")).toEqual({ id: "u1", email: "a@b.com" });
    expect(ok.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/auth/me");
    expect(await new CloudSessionGateway(config, vi.fn().mockResolvedValue(json(401, {}))).verifiedUser("easyfood_session=forjado")).toBeNull();
    expect(await new CloudSessionGateway(config, vi.fn().mockRejectedValue(new TypeError("x"))).verifiedUser("easyfood_session=xyz")).toBeNull();
    const none = vi.fn();
    expect(await new CloudSessionGateway(config, none).verifiedUser(null)).toBeNull();
    expect(none).not.toHaveBeenCalled();
  });

  it("logout chama a API e retransmite o cookie que apaga a sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": "easyfood_session=; Max-Age=0; Path=/" } }));
    expect(await new CloudSessionGateway(config, fetchFn).logout("easyfood_session=xyz")).toEqual(["easyfood_session=; Max-Age=0; Path=/"]);
  });

  it("primeiro acesso não existe na nuvem", async () => {
    const result = await new CloudSessionGateway(config, vi.fn()).firstAccess({ email: "a", newPassword: "b" });
    expect(result).toMatchObject({ ok: false, status: 404, error: { code: "feature_unavailable" } });
  });

  it("repasse leva cookie e tenant, e devolve o Set-Cookie de renovação", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }, "easyfood_session=novo; Path=/; HttpOnly"));
    const headers = new Headers({ "x-company-id": "c1", "x-store-id": "s1", authorization: "Bearer intruso" });
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/me/stores", search: "", headers, body: null, cookieHeader: "easyfood_session=xyz",
    });
    const sent = new Headers(fetchFn.mock.calls[0]![1].headers);
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/me/stores");
    expect(sent.get("cookie")).toBe("easyfood_session=xyz");
    expect(sent.get("x-company-id")).toBe("c1");
    expect(sent.get("x-store-id")).toBe("s1");
    expect(sent.get("authorization")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["easyfood_session=novo; Path=/; HttpOnly"]);
  });

  it("repasse mantém content-type e content-disposition de downloads", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([80, 75]), {
        status: 200,
        headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="notas.zip"' },
      }),
    );
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/nfce/notes-xml", search: "", headers: new Headers(), body: null, cookieHeader: "easyfood_session=xyz",
    });
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="notas.zip"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([80, 75]));
  });

  describe("cookies retransmitidos ficam visíveis ao proxy (Path=/, sem Domain)", () => {
    const raw = "easyfood_session=xyz; Domain=api.nuvem; Path=/api; HttpOnly";
    const normalized = "easyfood_session=xyz; Path=/; HttpOnly";

    it("no login", async () => {
      const fetchFn = vi.fn().mockResolvedValue(json(200, { user: { id: "u1", email: "a@b.com" } }, raw));
      const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a@b.com", password: "x" });
      expect(result.setCookies).toEqual([normalized]);
    });

    it("no logout", async () => {
      const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": raw } }));
      expect(await new CloudSessionGateway(config, fetchFn).logout("easyfood_session=xyz")).toEqual([normalized]);
    });

    it("no repasse, com sucesso ou erro", async () => {
      for (const backend of [json(200, { ok: true }, raw), json(403, { error: "forbidden" }, raw)]) {
        const response = await new CloudSessionGateway(config, vi.fn().mockResolvedValue(backend)).forward({
          method: "GET", path: "/v1/me/stores", search: "", headers: new Headers(), body: null, cookieHeader: "easyfood_session=xyz",
        });
        expect(response.headers.getSetCookie()).toEqual([normalized]);
      }
    });
  });

  it("login com a API fora do ar vira 503 com a mensagem de login", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a@b.com", password: "x" });
    expect(result).toEqual({
      ok: false,
      status: 503,
      error: { code: "backend_unreachable", message: "Não foi possível entrar agora." },
      setCookies: [],
    });
  });

  it.each([
    ["corpo que não é JSON", new Response("<html>ok</html>", { status: 200 })],
    ["JSON sem user", json(200, { ok: true })],
    ["user sem id", json(200, { user: { email: "a@b.com" } })],
  ])("login 200 com %s vira 502 invalid_response, sem cookie", async (_label, backend) => {
    const withCookie = new Response(await backend.text(), { status: 200, headers: { "set-cookie": "easyfood_session=x; Path=/" } });
    const result = await new CloudSessionGateway(config, vi.fn().mockResolvedValue(withCookie)).login({ email: "a", password: "b" });
    expect(result).toEqual({
      ok: false,
      status: 502,
      error: { code: "invalid_response", message: "A API devolveu uma resposta inválida." },
      setCookies: [],
    });
  });

  it("repasse com a API fora do ar não usa a mensagem de login", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/me/stores", search: "", headers: new Headers(), body: null, cookieHeader: "easyfood_session=xyz",
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "backend_unreachable",
      message: "Não foi possível contactar api.nuvem. Verifique o serviço e tente novamente.",
    });
  });

  it("repasse de 429 preserva o retry-after", async () => {
    const backend = new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "retry-after": "12" } });
    const response = await new CloudSessionGateway(config, vi.fn().mockResolvedValue(backend)).forward({
      method: "GET", path: "/v1/me/stores", search: "", headers: new Headers(), body: null, cookieHeader: "easyfood_session=xyz",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
  });
});
