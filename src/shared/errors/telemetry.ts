/**
 * O que aconteceu antes do erro: console, rede e passos do usuário — buffers circulares copiados
 * de `LEGACY/src/lib/error-reporter.ts`, com a mesma redação de dados (PII/segredos) e os mesmos
 * limites (100 linhas de console, 50 requisições, 50 passos, argumentos até 2048 caracteres).
 *
 * Compartilhado (`src/shared/errors/`): o relator não é de nenhum módulo — liga com o `ErrorBoundary`.
 */

const MAX_CONSOLE_ARG_LEN = 2048;
/** O próprio envio do relatório não entra no registro de rede (senão ele se relata a si mesmo). */
export const REPORT_PATH = "/api/error-report";
/** Primeiro argumento que marca mensagens internas do relator: não entram no buffer. */
export const INTERNAL_TAG = "__err_reporter_internal__";

class CircularBuffer<T> {
  private buf: T[] = [];
  constructor(private readonly cap: number) {}
  push(item: T) {
    if (this.buf.length >= this.cap) this.buf.shift();
    this.buf.push(item);
  }
  snapshot(): T[] {
    return [...this.buf];
  }
}

export interface ConsoleEntry {
  level: string;
  ts: string;
  args: unknown[];
}
export interface NetworkEntry {
  method: string;
  url: string;
  status: number | null;
  duration_ms: number | null;
  timestamp: string;
}
export interface StepEntry {
  type: "nav" | "click";
  ts: string;
  [key: string]: unknown;
}

export const consoleBuffer = new CircularBuffer<ConsoleEntry>(100);
export const networkBuffer = new CircularBuffer<NetworkEntry>(50);
export const stepsBuffer = new CircularBuffer<StepEntry>(50);

const SENSITIVE_KEYS = /authorization|apikey|token|secret|password|cookie/i;

function maskValue(val: unknown): unknown {
  if (typeof val === "string" && val.length > 8) return `${val.slice(0, 4)}****`;
  return "****";
}

/** Campo com nome de segredo perde o valor; em texto, somem o token de `Bearer` e os JWT. */
export function maskObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return obj.replace(/(Bearer\s+)\S+/gi, "$1****").replace(/(eyJ[A-Za-z0-9_-]{10})[A-Za-z0-9_-]+/g, "$1****");
  }
  if (Array.isArray(obj)) return obj.map(maskObject);
  if (typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      masked[k] = SENSITIVE_KEYS.test(k) ? maskValue(v) : maskObject(v);
    }
    return masked;
  }
  return obj;
}

export function truncateArg(arg: unknown): unknown {
  if (typeof arg === "string" && arg.length > MAX_CONSOLE_ARG_LEN) return `${arg.slice(0, MAX_CONSOLE_ARG_LEN)}…[truncated]`;
  if (typeof arg === "object" && arg !== null) {
    try {
      const json = JSON.stringify(arg);
      if (json.length > MAX_CONSOLE_ARG_LEN) return JSON.parse(`${json.slice(0, MAX_CONSOLE_ARG_LEN)}"}`) as unknown;
    } catch {
      /* mantém o original */
    }
  }
  return arg;
}

let installed = false;

function patchConsole() {
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      if (args[0] === INTERNAL_TAG) {
        original.call(console, ...args.slice(1));
        return;
      }
      consoleBuffer.push({ level, ts: new Date().toISOString(), args: args.map((a) => truncateArg(maskObject(a))) });
      original.call(console, ...args);
    };
  }
}

function patchFetch() {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes(REPORT_PATH)) return originalFetch(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    const start = performance.now();
    const timestamp = new Date().toISOString();
    try {
      const res = await originalFetch(input, init);
      networkBuffer.push({ method, url: maskObject(url) as string, status: res.status, duration_ms: Math.round(performance.now() - start), timestamp });
      return res;
    } catch (err) {
      networkBuffer.push({ method, url: maskObject(url) as string, status: null, duration_ms: Math.round(performance.now() - start), timestamp });
      throw err;
    }
  };
}

function patchSteps() {
  const origPush = history.pushState;
  history.pushState = function (...args: Parameters<History["pushState"]>) {
    const from = location.href;
    origPush.apply(this, args);
    stepsBuffer.push({ type: "nav", ts: new Date().toISOString(), from, to: location.href });
  };
  window.addEventListener("popstate", () => {
    stepsBuffer.push({ type: "nav", ts: new Date().toISOString(), to: location.href });
  });
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase() ?? "";
      const text = (target.textContent ?? "").trim().slice(0, 80);
      const selector =
        tag +
        (target.id ? `#${target.id}` : "") +
        (target.className && typeof target.className === "string" ? `.${target.className.split(/\s+/).slice(0, 2).join(".")}` : "");
      stepsBuffer.push({ type: "click", ts: new Date().toISOString(), target: selector, text });
    },
    { capture: true, passive: true },
  );
}

/** Passa a registrar console, rede e passos. Idempotente. */
export function installTelemetry(): boolean {
  if (installed) return false;
  installed = true;
  patchConsole();
  patchFetch();
  patchSteps();
  return true;
}
