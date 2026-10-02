import { describe, expect, it } from "vitest";
import {
  formatRelativeAgo,
  inboxEventCanRequeue,
  nextRetryLabel,
  recentEventRowTone,
  successTimestampLabel,
  sumRate,
  syncStatusBadgeStyle,
} from "./sync-events-format";
import { formatPayloadValue, isPlainObject } from "./payload-format";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("formatRelativeAgo", () => {
  it("ausente vira traço", () => expect(formatRelativeAgo(null, NOW)).toBe("—"));
  it("s/min/h/d com arredondamento para baixo", () => {
    expect(formatRelativeAgo(ago(59_999), NOW)).toBe("59s atrás");
    expect(formatRelativeAgo(ago(60_000), NOW)).toBe("1min atrás");
    expect(formatRelativeAgo(ago(59 * 60_000), NOW)).toBe("59min atrás");
    expect(formatRelativeAgo(ago(3 * 3_600_000), NOW)).toBe("3h atrás");
    expect(formatRelativeAgo(ago(49 * 3_600_000), NOW)).toBe("2d atrás");
  });
});

describe("nextRetryLabel", () => {
  it("sem data é imediato; passado é pronto agora; futuro em segundos (arredonda para cima)", () => {
    expect(nextRetryLabel(null, NOW)).toBe("imediato");
    expect(nextRetryLabel(ago(0), NOW)).toBe("pronto agora");
    expect(nextRetryLabel(ago(-1_500), NOW)).toBe("em 2s");
  });
});

describe("inboxEventCanRequeue", () => {
  it("failed sempre; pending só com retries", () => {
    expect(inboxEventCanRequeue({ status: "failed", retry_count: 0 })).toBe(true);
    expect(inboxEventCanRequeue({ status: "pending", retry_count: 1 })).toBe(true);
    expect(inboxEventCanRequeue({ status: "pending", retry_count: 0 })).toBe(false);
    expect(inboxEventCanRequeue({ status: "applied", retry_count: 3 })).toBe(false);
  });
});

describe("syncStatusBadgeStyle", () => {
  it("chave de sucesso configurável; desconhecido fica neutro", () => {
    expect(syncStatusBadgeStyle("applied", "applied")).toEqual({
      label: "applied",
      cls: "bg-success/15 text-success border-success/30",
    });
    expect(syncStatusBadgeStyle("dispatched", "applied")).toEqual({
      label: "applied",
      cls: "bg-muted/40 text-muted-foreground border-border",
    });
    expect(syncStatusBadgeStyle("dispatched", "pending").cls).toBe("bg-warning/15 text-warning border-warning/30");
    expect(syncStatusBadgeStyle("dispatched", "failed").cls).toBe(
      "bg-destructive/15 text-destructive border-destructive/30",
    );
  });
});

describe("recentEventRowTone / successTimestampLabel / sumRate", () => {
  it("tom da linha fechada por status; aberta sem tom", () => {
    expect(recentEventRowTone("applied", "applied", false)).toBe("bg-success/5");
    expect(recentEventRowTone("failed", "applied", false)).toBe("bg-destructive/5");
    expect(recentEventRowTone("pending", "applied", false)).toBe("bg-warning/5");
    expect(recentEventRowTone("failed", "applied", true)).toBe("");
  });
  it("rótulo do carimbo de sucesso", () => {
    expect(successTimestampLabel("applied")).toBe("Aplicado");
    expect(successTimestampLabel("dispatched")).toBe("Despachado");
  });
  it("soma por minuto", () => {
    expect(sumRate([])).toBe(0);
    expect(sumRate([{ minuto: "a", por_minuto: 2 }, { minuto: "b", por_minuto: 3 }])).toBe(5);
  });
});

describe("payload-format", () => {
  it("formatPayloadValue", () => {
    expect(formatPayloadValue(null)).toBe("—");
    expect(formatPayloadValue(undefined)).toBe("—");
    expect(formatPayloadValue(true)).toBe("Sim");
    expect(formatPayloadValue(false)).toBe("Não");
    expect(formatPayloadValue(1.5)).toBe("1.5");
    expect(formatPayloadValue("abc")).toBe("abc");
    const iso = "2026-01-15T10:20:00Z";
    expect(formatPayloadValue(iso)).toBe(new Date(iso).toLocaleString("pt-BR"));
  });
  it("isPlainObject", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
  });
});
