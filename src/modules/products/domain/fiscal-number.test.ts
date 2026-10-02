import { describe, expect, it } from "vitest";
import { fmtFiscalNum } from "./fiscal-number";

// Legado 1.3.12 (`Products.tsx#fmtFiscalNum`, PR #31): zero é valor, não ausência.
describe("fmtFiscalNum", () => {
  it("zero da loja (número) e da nuvem (texto) aparecem iguais — antes o 0 virava —", () => {
    expect(fmtFiscalNum(0, 2, "%")).toBe("0.00%");
    expect(fmtFiscalNum("0.00", 2, "%")).toBe("0.00%");
    expect(fmtFiscalNum("0", 2, "%")).toBe("0.00%");
  });

  it("casas fixas e sufixo opcional", () => {
    expect(fmtFiscalNum("18", 2, "%")).toBe("18.00%");
    expect(fmtFiscalNum(1.65, 4)).toBe("1.6500");
  });

  it("ausente é null (a linha mostra —); texto não numérico passa como está", () => {
    expect(fmtFiscalNum(null, 2, "%")).toBeNull();
    expect(fmtFiscalNum(undefined, 2)).toBeNull();
    expect(fmtFiscalNum("", 2)).toBeNull();
    expect(fmtFiscalNum("abc", 2)).toBe("abc");
  });
});
