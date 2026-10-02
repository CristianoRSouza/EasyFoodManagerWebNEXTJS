// @vitest-environment node
import { NextRequest } from "next/server";

const gateway = {
  login: vi.fn(),
  currentUser: vi.fn(),
  verifiedUser: vi.fn(),
  logout: vi.fn(),
  firstAccess: vi.fn(),
  forward: vi.fn(),
};
vi.mock("@/server/gateway", () => ({ getGateway: () => gateway }));

const { POST: login } = await import("./session/login/route");
const { GET: session } = await import("./session/route");
const { POST: logout } = await import("./session/logout/route");
const { POST: firstAccess } = await import("./session/first-access/route");
const proxyRoute = await import("./v1/[...path]/route");
const { POST: errorReport } = await import("./error-report/route");

const post = (url: string, body: unknown, cookie?: string) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : {} });

beforeEach(() => vi.clearAllMocks());

describe("/api/session", () => {
  it("login ok devolve o usuário e grava o cookie de sessão", async () => {
    gateway.login.mockResolvedValue({ ok: true, data: { id: "u1", email: "a@b" }, setCookies: ["efm_session=t; Path=/; HttpOnly"] });
    const response = await login(post("http://x/api/session/login", { email: "a@b", password: "p" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: { id: "u1", email: "a@b" } });
    expect(response.headers.getSetCookie()).toEqual(["efm_session=t; Path=/; HttpOnly"]);
  });

  it("login com corpo inválido responde 400 sem chamar o backend", async () => {
    const response = await login(post("http://x/api/session/login", { email: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid_body", message: "Preencha email e senha" });
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it("login recusado repassa status e erro", async () => {
    gateway.login.mockResolvedValue({ ok: false, status: 429, error: { code: "login_rate_limited", message: "Muitas" }, setCookies: [] });
    const response = await login(post("http://x/api/session/login", { email: "a@b", password: "p" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ code: "login_rate_limited", message: "Muitas" });
  });

  it("GET /api/session sem usuário é 401", async () => {
    gateway.currentUser.mockResolvedValue(null);
    const response = await session(new NextRequest("http://x/api/session"));
    expect(response.status).toBe(401);
  });

  it("logout responde 204 com os cookies que encerram a sessão", async () => {
    gateway.logout.mockResolvedValue(["efm_session=; Max-Age=0"]);
    const response = await logout(new NextRequest("http://x/api/session/logout", { method: "POST", headers: { cookie: "efm_session=t" } }));
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Max-Age=0"]);
    expect(gateway.logout).toHaveBeenCalledWith("efm_session=t");
  });

  it("primeiro acesso valida o corpo e responde 204", async () => {
    gateway.firstAccess.mockResolvedValue({ ok: true, data: null, setCookies: [] });
    const response = await firstAccess(post("http://x/api/session/first-access", { email: "a@b", newPassword: "123456" }));
    expect(response.status).toBe(204);
    expect(gateway.firstAccess).toHaveBeenCalledWith({ email: "a@b", newPassword: "123456", provisioningCode: undefined });
  });

  it("primeiro acesso ok repassa os cookies do gateway, como o login", async () => {
    gateway.firstAccess.mockResolvedValue({ ok: true, data: null, setCookies: ["efm_session=; Max-Age=0"] });
    const response = await firstAccess(post("http://x/api/session/first-access", { email: "a@b", newPassword: "123456" }));
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Max-Age=0"]);
  });

  it("GET /api/session sem usuário responde a mensagem de sessão expirada", async () => {
    gateway.currentUser.mockResolvedValue(null);
    const response = await session(new NextRequest("http://x/api/session"));
    expect(await response.json()).toEqual({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
  });
});

describe("/api/v1/[...path]", () => {
  it("repassa método, caminho, busca, corpo e cookie", async () => {
    gateway.forward.mockResolvedValue(new Response("{}", { status: 201 }));
    const request = new NextRequest("http://x/api/v1/totems?x=1", {
      method: "POST",
      body: '{"a":1}',
      headers: { cookie: "efm_session=t", "content-type": "application/json" },
    });
    const response = await proxyRoute.POST(request, { params: Promise.resolve({ path: ["totems"] }) });
    expect(response.status).toBe(201);
    const forwarded = gateway.forward.mock.calls[0]![0];
    expect(forwarded).toMatchObject({ method: "POST", path: "/v1/totems", search: "?x=1", cookieHeader: "efm_session=t" });
    expect(new TextDecoder().decode(forwarded.body)).toBe('{"a":1}');
  });

  it("GET não envia corpo", async () => {
    gateway.forward.mockResolvedValue(new Response("[]"));
    await proxyRoute.GET(new NextRequest("http://x/api/v1/products"), { params: Promise.resolve({ path: ["products"] }) });
    expect(gateway.forward.mock.calls[0]![0].body).toBeNull();
  });

  it.each([[["..", "admin"]], [["."]], [["products", ""]]])(
    "recusa segmento de caminho inválido %j sem chamar o backend",
    async (path) => {
      const response = await proxyRoute.GET(new NextRequest("http://x/api/v1/x"), { params: Promise.resolve({ path }) });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code: "invalid_path", message: "Caminho inválido." });
      expect(gateway.forward).not.toHaveBeenCalled();
    },
  );
});

describe("/api/error-report", () => {
  const report = { url: "http://x/", user_agent: "UA", error_message: "boom", console_logs: [], steps: [], metadata: {} };
  const reportRequest = (ip: string) =>
    new NextRequest("http://x/api/error-report", {
      method: "POST",
      body: JSON.stringify(report),
      headers: { cookie: "efm_session=a.eyJzdWIiOiJpbnRydXNvIiwiZW1haWwiOiJ4QHgifQ.forjada", "content-type": "application/json", origin: "http://x", "x-forwarded-for": ip },
    });

  it("autentica pela sessão VERIFICADA (não pelas claims decodificadas): token forjado é 401", async () => {
    gateway.currentUser.mockResolvedValue({ id: "intruso", email: "x@x" });
    gateway.verifiedUser.mockResolvedValue(null);
    const response = await errorReport(reportRequest("10.1.1.1"));
    expect(response.status).toBe(401);
    expect(gateway.verifiedUser).toHaveBeenCalledWith(expect.stringContaining("efm_session="));
    expect(gateway.currentUser).not.toHaveBeenCalled();
  });

  it("sessão verificada e envio desligado (sem ERROR_REPORT_SECRET): 204", async () => {
    gateway.verifiedUser.mockResolvedValue({ id: "u1", email: "a@b" });
    expect((await errorReport(reportRequest("10.1.1.2"))).status).toBe(204);
  });
});
