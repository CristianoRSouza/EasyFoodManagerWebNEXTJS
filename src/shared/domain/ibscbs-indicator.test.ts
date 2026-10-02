import { describe, expect, it } from "vitest";
import { indicadorLigado, indicadorSimNao } from "./ibscbs-indicator";

// Casos do legado 1.3.12 (`src/lib/__tests__/ibscbs-indicator.test.ts`, PRs #32/#43/#45).
describe("indicadorLigado", () => {
  it('loja: "0" é NÃO — era lido como verdadeiro e virava "Sim"', () => {
    expect(indicadorLigado("0")).toBe(false);
    expect(indicadorSimNao("0")).toBe("Não");
  });

  it('loja: "1" e "S" são SIM; "N" é NÃO', () => {
    expect(indicadorLigado("1")).toBe(true);
    expect(indicadorLigado("S")).toBe(true);
    expect(indicadorLigado(" s ")).toBe(true);
    expect(indicadorLigado("N")).toBe(false);
  });

  it("nuvem: boolean e 'S'/null dos grupos", () => {
    expect(indicadorLigado(true)).toBe(true);
    expect(indicadorLigado(false)).toBe(false);
    expect(indicadorLigado(null)).toBe(false);
  });

  it("número 1 é SIM; outro número é NÃO", () => {
    expect(indicadorLigado(1)).toBe(true);
    expect(indicadorLigado(0)).toBe(false);
  });

  it("vazio do governo é NÃO nas duas fontes", () => {
    expect(indicadorSimNao("")).toBe("Não");
    expect(indicadorSimNao(undefined)).toBe("Não");
  });
});
