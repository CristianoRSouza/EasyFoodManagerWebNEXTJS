// @vitest-environment-options {"url": "https://painel.easysoftcloud.com.br/nfce"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maskObject, truncateArg } from "./telemetry";
import { KEEPALIVE_MAX_BYTES } from "./report-limits";

type Reporter = typeof import("./error-reporter");

// `html2canvas` não desenha no jsdom: simulado, como a captura que o legado anexa ao relatório.
const html2canvas = vi.hoisted(() => vi.fn());
vi.mock("html2canvas", () => ({ default: html2canvas }));
const SHOT = "data:image/jpeg;base64,AAAA";

async function freshReporter(): Promise<Reporter> {
  vi.resetModules();
  return import("./error-reporter");
}

let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
  fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }));
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchSpy);
  html2canvas.mockReset().mockResolvedValue({ toDataURL: () => SHOT });
});
afterEach(() => vi.restoreAllMocks());

/** Corpos enviados a `/api/error-report` (as demais chamadas simuladas não contam). */
const reportCalls = () => fetchSpy.mock.calls.filter(([input, init]) => String(input) === "/api/error-report" && init?.body);
const sentBodies = () => reportCalls().map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);

describe("redação (mesma do legado)", () => {
  it("mascara campos sensíveis, Bearer e JWT", () => {
    expect(
      maskObject({
        Authorization: "Bearer abcdefghijkl",
        password: "123",
        nested: { msg: "token Bearer xyz e eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig" },
      }),
    ).toEqual({
      Authorization: "Bear****",
      password: "****",
      nested: { msg: "token Bearer **** e eyJhbGciOiJIU****.eyJzdWIiOiIxI****.sig" },
    });
  });

  it("corta argumentos longos em 2048 caracteres", () => {
    expect(truncateArg("x".repeat(3000))).toBe(`${"x".repeat(2048)}…[truncated]`);
  });
});

describe("reportError", () => {
  it("envia ao próprio servidor (/api/error-report), com o formato do legado e a captura de tela (html2canvas)", async () => {
    const { reportError } = await freshReporter();
    await reportError(new Error("boom"), { component_stack: "at X" });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/error-report");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(sentBodies()[0]).toMatchObject({
      url: "https://painel.easysoftcloud.com.br/nfce",
      error_message: "boom",
      component_stack: "at X",
      screenshot: SHOT,
      console_logs: expect.any(Array),
      steps: expect.any(Array),
      metadata: { route: "/nfce", network: expect.any(Array), viewport: expect.any(Object) },
    });
  });

  it("captura com as opções do legado; falha na captura ou corpo acima do teto: segue sem ela", async () => {
    const { reportError } = await freshReporter();
    await reportError(new Error("a"));
    expect(html2canvas).toHaveBeenCalledWith(document.body, expect.objectContaining({ logging: false, useCORS: true, allowTaint: true }));
    html2canvas.mockRejectedValueOnce(new Error("canvas"));
    await reportError(new Error("b"));
    const { MAX_REPORT_BYTES } = await import("./report-limits");
    html2canvas.mockResolvedValueOnce({ toDataURL: () => "x".repeat(MAX_REPORT_BYTES) });
    await reportError(new Error("c"));
    expect(sentBodies().map((b) => b.screenshot)).toEqual([SHOT, null, null]);
  });

  describe("I3 — keepalive só com corpo pequeno (o navegador recusa keepalive acima de 64 KiB)", () => {
    const initOf = (i: number) => reportCalls()[i]![1] as RequestInit;

    it("corpo pequeno (sem captura ou captura leve): keepalive, para sobreviver ao fechamento da aba", async () => {
      const { reportError } = await freshReporter();
      await reportError(new Error("leve"));
      const init = initOf(0);
      expect(new TextEncoder().encode(String(init.body)).byteLength).toBeLessThanOrEqual(KEEPALIVE_MAX_BYTES);
      expect(init.keepalive).toBe(true);
    });

    it("captura grande: envio normal (sem keepalive), COM a captura — antes o relatório se perdia em silêncio", async () => {
      const bigShot = `data:image/jpeg;base64,${"A".repeat(300 * 1024)}`;
      html2canvas.mockResolvedValueOnce({ toDataURL: () => bigShot });
      const { reportError } = await freshReporter();
      await reportError(new Error("pesado"));
      const init = initOf(0);
      expect(init.keepalive).toBe(false);
      expect(sentBodies()[0]!.screenshot).toBe(bigShot);
    });

    it("acima do teto da rota: vai sem a captura (e aí cabe no keepalive)", async () => {
      const { MAX_REPORT_BYTES } = await import("./report-limits");
      html2canvas.mockResolvedValueOnce({ toDataURL: () => `data:image/jpeg;base64,${"A".repeat(MAX_REPORT_BYTES)}` });
      const { reportError } = await freshReporter();
      await reportError(new Error("enorme"));
      expect(sentBodies()[0]!.screenshot).toBeNull();
      expect(initOf(0).keepalive).toBe(true);
    });

    it("a versão enviada é a do pacote (mesma fonte do rótulo exibido)", async () => {
      const { APP_VERSION } = await import("@/shared/version");
      const { reportError } = await freshReporter();
      await reportError(new Error("versão"));
      expect((sentBodies()[0]!.metadata as { release: string }).release).toBe(APP_VERSION);
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  it("anti-inundação: mesmo erro em 60 s vira um só; teto de 5 por sessão", async () => {
    const { reportError } = await freshReporter();
    await reportError(new Error("igual"));
    await reportError(new Error("igual"));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) await reportError(new Error(`erro ${i}`));
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it("nunca lança, nem com a entrega falhando", async () => {
    fetchSpy.mockRejectedValue(new TypeError("offline"));
    const { reportError } = await freshReporter();
    await expect(reportError("texto solto")).resolves.toBeUndefined();
    expect(sentBodies()[0]?.error_message).toBe("texto solto");
  });
});

describe("installErrorReporter", () => {
  it("registra rede (menos o próprio envio) e console, e relata rejeição não tratada", async () => {
    const reporter = await freshReporter();
    const telemetry = await import("./telemetry");
    reporter.installErrorReporter();
    await fetch("/api/v1/orders?token=1");
    await fetch("/api/error-report", { method: "POST" });
    console.warn("aviso", { apikey: "abcdefghijk" });
    const network = telemetry.networkBuffer.snapshot().map((n) => n.url);
    expect(network).toContain("/api/v1/orders?token=1");
    expect(network).not.toContain("/api/error-report");
    expect(telemetry.consoleBuffer.snapshot().at(-1)).toMatchObject({ level: "warn", args: ["aviso", { apikey: "abcd****" }] });

    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new Error("sem catch") }));
    await vi.waitFor(() => expect(sentBodies()).toHaveLength(1));
    expect(sentBodies().at(-1)?.error_message).toBe("sem catch");
  });
});
