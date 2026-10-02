import { describe, it, expect } from "vitest";
import { extractYear, matchesYear, yearFilterOptions } from "./year-filter";

describe("extractYear", () => {
  it("lê o ano do prefixo de uma data ISO em string, sem conversão de fuso", () => {
    // Uma data "2026-01-01" convertida com `new Date(...).getFullYear()` no fuso local pode virar
    // 2025 (UTC-3 vira 31/12 21h). O legado evita isso lendo o prefixo direto da string.
    expect(extractYear("2026-01-01")).toBe(2026);
    expect(extractYear("2025-12-31T23:00:00.000Z")).toBe(2025);
  });

  it("lê o ano de um Date pelo UTC", () => {
    expect(extractYear(new Date(Date.UTC(2027, 5, 15)))).toBe(2027);
  });

  it("devolve null para valor ausente", () => {
    expect(extractYear(null)).toBeNull();
    expect(extractYear(undefined)).toBeNull();
    expect(extractYear("")).toBeNull();
  });
});

describe("matchesYear", () => {
  it("com filtro 'all', aceita qualquer linha (mesmo sem nenhuma data)", () => {
    expect(matchesYear("all", [])).toBe(true);
    expect(matchesYear("all", [null, undefined])).toBe(true);
  });

  it("aceita a linha se QUALQUER campo de data bater com o ano filtrado", () => {
    expect(matchesYear("2026", ["2025-01-01", "2026-06-01", null])).toBe(true);
  });

  it("rejeita a linha se nenhum campo de data bater com o ano filtrado", () => {
    expect(matchesYear("2026", ["2025-01-01", "2027-06-01", null])).toBe(false);
  });

  it("rejeita quando não há nenhum campo de data e o filtro não é 'all'", () => {
    expect(matchesYear("2026", [])).toBe(false);
    expect(matchesYear("2026", [null, undefined])).toBe(false);
  });
});

describe("yearFilterOptions", () => {
  it("lista do ano seguinte até 5 anos atrás, decrescente", () => {
    expect(yearFilterOptions(2026)).toEqual(["2027", "2026", "2025", "2024", "2023", "2022", "2021"]);
  });
});
