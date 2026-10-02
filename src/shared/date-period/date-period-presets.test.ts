import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toYmdLocal,
  fromYmdLocal,
  fmtPtBrFromYmd,
  computePeriodRange,
  ymdNextDayLocal,
  ymdToLocalMidnightIso,
  ymdNextDayLocalIso,
} from "./date-period-presets";

describe("date-period-presets", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("toYmdLocal", () => {
    it("formata data local como YYYY-MM-DD", () => {
      const d = new Date(2026, 4, 6, 15, 30);
      expect(toYmdLocal(d)).toBe("2026-05-06");
    });
  });

  describe("fromYmdLocal", () => {
    it("parseia YYYY-MM-DD válido", () => {
      const d = fromYmdLocal("2026-05-06");
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(6);
    });

    it("rejeita formatos inválidos e datas impossíveis", () => {
      expect(fromYmdLocal("")).toBeUndefined();
      expect(fromYmdLocal("2026-1-6")).toBeUndefined();
      expect(fromYmdLocal("2026-02-30")).toBeUndefined();
      expect(fromYmdLocal("2026-13-01")).toBeUndefined();
      expect(fromYmdLocal("2026-00-10")).toBeUndefined();
    });
  });

  describe("fmtPtBrFromYmd", () => {
    it("formata em pt-BR ou placeholder", () => {
      expect(fmtPtBrFromYmd("2026-05-06")).toMatch(/06\/05\/2026/);
      expect(fmtPtBrFromYmd("invalid")).toBe("Selecionar");
    });
  });

  describe("computePeriodRange", () => {
    it("all retorna intervalo vazio", () => {
      expect(computePeriodRange("all")).toEqual({ from: "", to: "" });
    });

    it("today retorna mesmo dia", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
      const range = computePeriodRange("today");
      expect(range).toEqual({ from: "2026-05-23", to: "2026-05-23" });
    });

    it("7d inclui hoje e 6 dias anteriores (7 dias)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
      const range = computePeriodRange("7d");
      expect(range).toEqual({ from: "2026-05-17", to: "2026-05-23" });
    });

    it("30d inclui 30 dias corridos", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
      const range = computePeriodRange("30d");
      expect(range).toEqual({ from: "2026-04-24", to: "2026-05-23" });
    });

    it("year inclui 365 dias (364 dias atrás + hoje)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
      const range = computePeriodRange("year");
      expect(range).toEqual({ from: "2025-05-24", to: "2026-05-23" });
    });

    it("semester inclui 183 dias (182 dias atrás + hoje)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 23, 12, 0, 0));
      const range = computePeriodRange("semester");
      expect(range).toEqual({ from: "2025-11-22", to: "2026-05-23" });
    });
  });

  describe("ymdNextDayLocal", () => {
    it("avança um dia no calendário local", () => {
      expect(ymdNextDayLocal("2026-05-06")).toBe("2026-05-07");
    });

    it("atravessa virada de mês", () => {
      expect(ymdNextDayLocal("2026-05-31")).toBe("2026-06-01");
    });

    it("devolve original quando formato é inválido", () => {
      expect(ymdNextDayLocal("bad-date")).toBe("bad-date");
    });

    it("rejeita datas impossíveis sem normalizar silenciosamente", () => {
      expect(ymdNextDayLocal("2026-02-30")).toBe("2026-02-30");
      expect(ymdNextDayLocal("2026-13-01")).toBe("2026-13-01");
    });

    it("atravessa virada de ano", () => {
      expect(ymdNextDayLocal("2025-12-31")).toBe("2026-01-01");
    });
  });

  describe("ymdToLocalMidnightIso / ymdNextDayLocalIso", () => {
    it("converte meia-noite local para ISO", () => {
      const d = fromYmdLocal("2026-05-06")!;
      expect(ymdToLocalMidnightIso("2026-05-06")).toBe(d.toISOString());
    });

    it("ymdNextDayLocalIso usa início do dia seguinte", () => {
      const next = fromYmdLocal(ymdNextDayLocal("2026-05-06"))!;
      expect(ymdNextDayLocalIso("2026-05-06")).toBe(next.toISOString());
    });

    it("fallback quando ymd inválido", () => {
      expect(ymdToLocalMidnightIso("x")).toBe("xT00:00:00");
      expect(ymdNextDayLocalIso("x")).toBe("xT00:00:00");
    });
  });
});
