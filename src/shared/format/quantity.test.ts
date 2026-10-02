import { describe, expect, it } from "vitest";
import { formatQuantity, isZeroQuantity } from "./quantity";

// Casos do legado 1.3.12 (`src/lib/__tests__/quantity-format.test.ts`, PR #30).
describe("formatQuantity", () => {
  it("unidade inteira: sem casas, venha número ou o texto do numeric", () => {
    expect(formatQuantity(-388, false)).toBe("-388");
    expect(formatQuantity("-388.0000", false)).toBe("-388");
    expect(formatQuantity("0.0000", false)).toBe("0");
  });

  it("unidade fracionária: sempre 3 casas", () => {
    expect(formatQuantity(1.25, true)).toBe("1.250");
    expect(formatQuantity("2.0000", true)).toBe("2.000");
    expect(formatQuantity(-0, true)).toBe("0.000");
  });

  it("unidade inteira com fração no dado: mostra a fração em vez de arredondar", () => {
    expect(formatQuantity(2.5, false)).toBe("2.5");
    expect(formatQuantity("1.2346", false)).toBe("1.235");
  });

  it("unidade desconhecida segue o critério da inteira", () => {
    expect(formatQuantity(-1330)).toBe("-1330");
    expect(formatQuantity(0.75, null)).toBe("0.75");
  });

  it("vazio vira travessão; texto não numérico passa como está", () => {
    expect(formatQuantity(null)).toBe("—");
    expect(formatQuantity("")).toBe("—");
    expect(formatQuantity("abc")).toBe("abc");
  });
});

describe("isZeroQuantity", () => {
  it("reconhece zero como número e como texto do numeric", () => {
    expect(isZeroQuantity(0)).toBe(true);
    expect(isZeroQuantity("0.0000")).toBe(true);
    expect(isZeroQuantity(-3)).toBe(false);
    expect(isZeroQuantity(null)).toBe(false);
    expect(isZeroQuantity("")).toBe(false);
  });
});
