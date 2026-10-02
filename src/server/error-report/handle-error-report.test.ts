// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EASYGUARDIAN_URL, readErrorReportConfig } from "./error-report-config";
import { MAX_REPORT_BYTES, SOURCE_APP, SOURCE_PROJECT_ID } from "./error-report-payload";
import { handleErrorReport, type ErrorReportDeps, type ErrorReportRequest } from "./handle-error-report";
import { createRateLimiter } from "./rate-limiter";

const report = {
  source_app: "OutroSistema",
  source_project_id: "falso",
  user_id: "forjado",
  user_email: "forjado@x.com",
  company_id: null,
  url: "https://painel.easysoftcloud.com.br/nfce",
  user_agent: "UA",
  error_message: "boom",
  error_stack: "Error: boom\n at x",
  component_stack: null,
  console_logs: [{ level: "error", ts: "t", args: ["x"] }],
  steps: [{ type: "click", ts: "t", target: "button", text: "Salvar" }],
  screenshot: null,
  metadata: { viewport: { w: 1, h: 1 }, network: [], release: "1.2.96", route: "/nfce" },
};

const user = { id: "u1", email: "ana@loja.com" };
const enabled = { enabled: true as const, url: "https://guardian.test/report", secret: "s3cr3t" };
const SHOT = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

const limits = () => ({
  byIp: createRateLimiter({ limit: 20, windowMs: 60_000 }),
  byUser: createRateLimiter({ limit: 5, windowMs: 60_000 }),
});

function deps(over: Partial<ErrorReportDeps> = {}) {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
  const verifiedUser = vi.fn<ErrorReportDeps["verifiedUser"]>().mockResolvedValue(user);
  return { fetchFn, verifiedUser, deps: { config: enabled, verifiedUser, fetchFn, limits: limits(), ...over } as ErrorReportDeps };
}

const baseHeaders = { "content-type": "application/json", origin: "https://painel.loja", host: "painel.loja", cookie: "efm_session=x" };

type Over = { headers?: Record<string, string | null>; ip?: string; stream?: ReadableStream<Uint8Array> };

function request(body: unknown, over: Over = {}): ErrorReportRequest {
  const headers = new Headers();
  for (const [k, v] of Object.entries({ ...baseHeaders, ...over.headers })) if (v !== null) headers.set(k, v);
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { url: "https://painel.loja/api/error-report", headers, body: over.stream ?? new Response(text).body, clientIp: over.ip ?? "10.0.0.9" };
}

const call = (body: unknown, d: ErrorReportDeps, over?: Over) => handleErrorReport(request(body, over), d);
const sentBody = (fetchFn: ReturnType<typeof vi.fn<typeof fetch>>) => JSON.parse(String((fetchFn.mock.calls[0] as [string, RequestInit])[1].body));

/** Fluxo chunked (sem content-length) que conta quanto foi lido. */
function chunkedStream(chunks: number, size: number) {
  let read = 0;
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= chunks) return controller.close();
      sent++;
      read += size;
      controller.enqueue(new Uint8Array(size).fill(32));
    },
  }, { highWaterMark: 0 }); // só produz quando alguém lê
  return { stream, readBytes: () => read };
}

describe("readErrorReportConfig", () => {
  it("sem ERROR_REPORT_SECRET o envio fica desligado", () => {
    expect(readErrorReportConfig({} as unknown as NodeJS.ProcessEnv)).toEqual({ enabled: false });
    expect(readErrorReportConfig({ ERROR_REPORT_SECRET: "  " } as unknown as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });
  it("com segredo: destino padrão é o EasyGuardian do legado (sobrescrevível por https)", () => {
    expect(readErrorReportConfig({ ERROR_REPORT_SECRET: "k" } as unknown as NodeJS.ProcessEnv)).toEqual({ enabled: true, url: EASYGUARDIAN_URL, secret: "k" });
    expect(readErrorReportConfig({ ERROR_REPORT_SECRET: "k", ERROR_REPORT_URL: "https://x" } as unknown as NodeJS.ProcessEnv)).toMatchObject({ url: "https://x" });
  });
  it("ERROR_REPORT_URL sem https (o segredo iria em claro) ou inválida: desliga e avisa no log, sem o segredo", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const url of ["http://guardian.test/report", "ftp://x", "não é url"]) {
      expect(readErrorReportConfig({ ERROR_REPORT_SECRET: "segredo-k", ERROR_REPORT_URL: url } as unknown as NodeJS.ProcessEnv)).toEqual({ enabled: false });
    }
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(" ")).not.toContain("segredo-k");
    warn.mockRestore();
  });
});

describe("handleErrorReport", () => {
  it("encaminha ao EasyGuardian com o segredo no cabeçalho; usuário vem da sessão VERIFICADA, origem é fixa", async () => {
    const { fetchFn, verifiedUser, deps: d } = deps();
    const response = await call({ ...report, screenshot: SHOT }, d);
    expect(response.status).toBe(202);
    expect(verifiedUser).toHaveBeenCalledWith("efm_session=x");
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://guardian.test/report");
    expect(new Headers(init.headers).get("x-report-secret")).toBe("s3cr3t");
    expect(sentBody(fetchFn)).toMatchObject({
      source_app: SOURCE_APP,
      source_project_id: SOURCE_PROJECT_ID,
      user_id: "u1",
      user_email: "ana@loja.com",
      company_id: null,
      error_message: "boom",
      screenshot: SHOT,
      metadata: { release: "1.2.96", route: "/nfce" },
    });
  });

  it("a resposta nunca carrega o segredo nem o corpo do destino", async () => {
    const { deps: d } = deps({ fetchFn: vi.fn<typeof fetch>().mockResolvedValue(new Response('{"secret":"s3cr3t"}', { status: 200 })) });
    const response = await call(report, d);
    expect(await response.text()).toBe("");
  });

  it("C1 — token forjado (a API não confirma a sessão): 401, corpo nem lido e nada encaminhado", async () => {
    const { fetchFn, deps: d } = deps({ verifiedUser: async () => null });
    const { stream, readBytes } = chunkedStream(4, 1024);
    const response = await call(report, d, { stream, headers: { cookie: "efm_session=x.eyJzdWIiOiJpbnRydXNvIn0.forjada" } });
    expect(response.status).toBe(401);
    expect(readBytes()).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falha ao verificar a sessão (backend fora do ar) também é 401", async () => {
    const { fetchFn, deps: d } = deps({ verifiedUser: async () => Promise.reject(new Error("down")) });
    expect((await call(report, d)).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("desligado por configuração: 204 e nada é enviado", async () => {
    const { fetchFn, deps: d } = deps({ config: { enabled: false } });
    expect((await call(report, d)).status).toBe(204);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("corpo inválido, registros acima dos limites do legado ou captura que não é JPEG: 400", async () => {
    const { fetchFn, deps: d } = deps();
    expect((await call("não é json", d)).status).toBe(400);
    expect((await call({ ...report, error_message: undefined }, d)).status).toBe(400);
    expect((await call({ ...report, console_logs: Array.from({ length: 101 }, () => ({})) }, d)).status).toBe(400);
    expect((await call({ ...report, screenshot: "data:text/html;base64,PHNjcmlwdD4=" }, d)).status).toBe(400);
    expect((await call({ ...report, screenshot: "https://evil/x.jpg" }, d)).status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  describe("I1 — teto do corpo", () => {
    it("content-length declarado acima do teto: 413 sem autenticar nem ler", async () => {
      const { fetchFn, verifiedUser, deps: d } = deps();
      const response = await call(report, d, { headers: { "content-length": String(MAX_REPORT_BYTES + 1) } });
      expect(response.status).toBe(413);
      expect(verifiedUser).not.toHaveBeenCalled();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("chunked (sem content-length) acima do teto: 413, leitura interrompida logo após o teto", async () => {
      const { fetchFn, deps: d } = deps();
      const chunk = 256 * 1024;
      const { stream, readBytes } = chunkedStream(64, chunk); // 16 MiB oferecidos
      const response = await call(report, d, { stream });
      expect(response.status).toBe(413);
      expect(readBytes()).toBeLessThanOrEqual(MAX_REPORT_BYTES + 3 * chunk);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("corpo acima do teto com content-length mentindo para menos: 413", async () => {
      const { deps: d } = deps();
      const response = await call({ ...report, screenshot: "x".repeat(MAX_REPORT_BYTES) }, d, { headers: { "content-length": "10" } });
      expect(response.status).toBe(413);
    });
  });

  describe("I2 — limite de frequência no servidor", () => {
    it("sexta chamada seguida do mesmo usuário: 429 com retry-after, sem encaminhar", async () => {
      const { fetchFn, deps: d } = deps();
      for (let i = 0; i < 5; i++) expect((await call(report, d)).status).toBe(202);
      const sixth = await call(report, d);
      expect(sixth.status).toBe(429);
      expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(fetchFn).toHaveBeenCalledTimes(5);
    });

    it("por IP: vinte tentativas por minuto, mesmo com sessões diferentes (ou forjadas)", async () => {
      const { fetchFn, verifiedUser, deps: d } = deps();
      let n = 0;
      verifiedUser.mockImplementation(async () => ({ id: `u${n++}`, email: null }));
      for (let i = 0; i < 20; i++) expect((await call(report, d)).status).toBe(202);
      const next = await call(report, d);
      expect(next.status).toBe(429);
      expect(verifiedUser).toHaveBeenCalledTimes(20);
      expect(fetchFn).toHaveBeenCalledTimes(20);
      expect((await call(report, d, { ip: "10.0.0.10" })).status).toBe(202);
    });
  });

  describe("Menor 5 — defesa em profundidade", () => {
    it("content-type diferente de JSON: 415", async () => {
      const { fetchFn, deps: d } = deps();
      expect((await call(report, d, { headers: { "content-type": "text/plain" } })).status).toBe(415);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("Origin ausente ou de outro host: 403 (CSRF); atrás de proxy, x-forwarded-host vale", async () => {
      const { fetchFn, deps: d } = deps();
      expect((await call(report, d, { headers: { origin: null } })).status).toBe(403);
      expect((await call(report, d, { headers: { origin: "https://evil.example" } })).status).toBe(403);
      expect(fetchFn).not.toHaveBeenCalled();
      const behindProxy = await call(report, d, {
        headers: { origin: "https://painel.cliente.com", host: "127.0.0.1:3000", "x-forwarded-host": "painel.cliente.com" },
      });
      expect(behindProxy.status).toBe(202);
    });

    it("reaplica a redação no servidor antes de encaminhar (sem estragar a captura)", async () => {
      const { fetchFn, deps: d } = deps();
      await call(
        {
          ...report,
          screenshot: SHOT,
          error_message: "falhou com Bearer abc.def.ghi",
          console_logs: [{ level: "error", args: [{ password: "123456789", apikey: "abcdefghijk" }] }],
          metadata: { ...report.metadata, network: [{ url: "/api/v1/x?t=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig" }] },
        },
        d,
      );
      const sent = sentBody(fetchFn);
      expect(sent.error_message).toBe("falhou com Bearer ****");
      expect(sent.console_logs[0].args[0]).toEqual({ password: "1234****", apikey: "abcd****" });
      expect(sent.metadata.network[0].url).not.toContain("eyJzdWIiOiIxIn0");
      expect(sent.screenshot).toBe(SHOT);
    });
  });

  it("destino recusou ou fora do ar: 502", async () => {
    const rejected = deps({ fetchFn: vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 })) });
    expect((await call(report, rejected.deps)).status).toBe(502);
    const down = deps({ fetchFn: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")) });
    expect((await call(report, down.deps)).status).toBe(502);
  });
});
