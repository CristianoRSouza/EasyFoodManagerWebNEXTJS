import { describe, expect, it } from "vitest";
import { formatCnpj, formatCep, taxRegimeLabel, envLabel } from "./helpers";

describe("formatCnpj", () => {
  it("formata 14 dígitos no padrão XX.XXX.XXX/XXXX-XX", () => {
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("devolve inalterado quando não bate com 14 dígitos", () => {
    expect(formatCnpj("123")).toBe("123");
    expect(formatCnpj("")).toBe("");
  });
});

describe("formatCep", () => {
  it("formata 8 dígitos no padrão XXXXX-XXX", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("devolve inalterado quando não bate com 8 dígitos", () => {
    expect(formatCep("123")).toBe("123");
  });
});

describe("taxRegimeLabel", () => {
  it("mapeia os códigos conhecidos", () => {
    expect(taxRegimeLabel(1)).toBe("Simples Nacional");
    expect(taxRegimeLabel(2)).toBe("Simples Nacional – Excesso Receita");
    expect(taxRegimeLabel(3)).toBe("Regime Normal");
    expect(taxRegimeLabel(4)).toBe("MEI");
  });

  it("devolve o próprio código como string quando desconhecido", () => {
    expect(taxRegimeLabel(9)).toBe("9");
  });

  it('regime ausente é null (a tela mostra "—"), nunca Regime Normal', () => {
    expect(taxRegimeLabel(null)).toBeNull();
    expect(taxRegimeLabel(undefined)).toBeNull();
  });
});

describe("envLabel", () => {
  it("1 é Produção, qualquer outro é Homologação", () => {
    expect(envLabel(1)).toBe("Produção");
    expect(envLabel(2)).toBe("Homologação");
    expect(envLabel(0)).toBe("Homologação");
  });
});
