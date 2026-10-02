import { describe, expect, it } from "vitest";
import { buildTimeline, cyclesBetween, dayLabel } from "./track-timeline";
import type { MirrorEvent, MirrorRecordChange } from "./sync-mirror";

const change = (id: string, at: string): MirrorRecordChange => ({
  id,
  changedAt: at,
  direction: "fb_to_pg",
  entity: "products",
  key: "7891",
  recordId: null,
  op: "update",
  label: "Coca",
  fields: ["sale_price"],
  detail: { sale_price: { from: 6, to: 9 } },
});

const event = (id: string, at: string, message: string | null): MirrorEvent => ({
  id,
  createdAt: at,
  direction: "pg_to_fb",
  table: "orders",
  recordsAffected: 0,
  recordId: null,
  status: "error",
  message,
});

describe("linha do tempo da aba Alterações", () => {
  it("sem termo: mais recente primeiro", () => {
    const items = buildTimeline(
      [change("a", "2026-09-30T10:00:00Z"), change("b", "2026-09-30T11:00:00Z")],
      [],
      false,
    );
    expect(items.map((i) => i.at)).toEqual(["2026-09-30T11:00:00Z", "2026-09-30T10:00:00Z"]);
  });

  it("com termo: cronológica, misturando mudanças e mensagens do serviço", () => {
    const items = buildTimeline(
      [change("b", "2026-09-30T11:00:00Z")],
      [event("e", "2026-09-30T10:30:00Z", null)],
      true,
    );
    expect(items.map((i) => i.kind)).toEqual(["event", "change"]);
    expect(items[0]).toMatchObject({ kind: "event", entity: "orders", message: "" });
    expect(items[1]).toMatchObject({ kind: "change", label: "Coca", detail: { sale_price: { from: 6, to: 9 } } });
  });

  it("separador de dia", () => {
    const now = new Date(2026, 8, 30, 12, 0, 0).getTime();
    expect(dayLabel(new Date(2026, 8, 30, 8).toISOString(), now)).toBe("hoje");
    expect(dayLabel(new Date(2026, 8, 29, 23).toISOString(), now)).toBe("ontem");
    expect(dayLabel(new Date(2026, 8, 20, 9).toISOString(), now)).toBe("20/09/2026");
  });

  it("lacuna em ciclos de 5 s", () => {
    expect(cyclesBetween("2026-09-30T10:00:00Z", "2026-09-30T10:01:00Z")).toEqual({ gapMs: 60_000, cycles: 12 });
  });
});
