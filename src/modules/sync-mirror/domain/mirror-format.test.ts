import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatCount,
  formatDayTime,
  formatDuration,
  formatGap,
  formatRelative,
  formatSince,
} from "./mirror-format";

describe("formatação do espelho", () => {
  it("contagem com separador pt-BR; ausente vira travessão", () => {
    expect(formatCount(1234)).toBe("1.234");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(null)).toBe("—");
    expect(formatCount(Number.NaN)).toBe("—");
  });

  it("duração: abaixo de 1 s em ms, acima com uma casa", () => {
    expect(formatDuration(0.612)).toBe("612 ms");
    expect(formatDuration(1.84)).toBe("1,8 s");
    expect(formatDuration(null)).toBe("—");
  });

  it("idade em segundos, minutos e horas", () => {
    expect(formatSince(3.4)).toBe("3 s");
    expect(formatSince(89)).toBe("89 s");
    expect(formatSince(240)).toBe("4 min");
    expect(formatSince(3 * 3600)).toBe("3 h");
    expect(formatSince(-5)).toBe("0 s");
    expect(formatSince(undefined)).toBe("—");
  });

  it("tempo relativo a um 'agora' fixo", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(formatRelative("2026-09-30T11:59:58Z", now)).toBe("agora");
    expect(formatRelative("2026-09-30T11:59:40Z", now)).toBe("há 20 s");
    expect(formatRelative("2026-09-30T11:45:00Z", now)).toBe("há 15 min");
    expect(formatRelative("2026-09-30T09:00:00Z", now)).toBe("há 3 h");
    expect(formatRelative("2026-09-27T12:00:00Z", now)).toBe("há 3 d");
    expect(formatRelative("2026-09-30T12:00:30Z", now)).toBe("agora");
    expect(formatRelative("não é data", now)).toBe("—");
    expect(formatRelative(null, now)).toBe("—");
  });

  it("hora e dia/hora no formato do legado", () => {
    const iso = "2026-09-30T12:03:09Z";
    const d = new Date(iso);
    expect(formatClock(iso)).toBe(d.toLocaleTimeString("pt-BR", { hour12: false }));
    expect(formatDayTime(iso)).toBe(
      `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`,
    );
    expect(formatClock(null)).toBe("—");
    expect(formatDayTime("x")).toBe("—");
  });

  it("lacuna em minutos até 1 h, depois em horas", () => {
    expect(formatGap(12 * 60_000)).toBe("12 min");
    expect(formatGap(3 * 3_600_000)).toBe("3 h");
  });
});
