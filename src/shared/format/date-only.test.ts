import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatDateOnlyBR } from "./date-only";

// Casos do legado 1.3.12 (`src/lib/__tests__/date-only.test.ts`, PR #34).
describe("formatDateOnlyBR", () => {
  const tzOriginal = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  afterEach(() => {
    process.env.TZ = tzOriginal;
  });

  it('nuvem: "2026-01-01" é 01/01/2026 — não 31/12/2025', () => {
    expect(formatDateOnlyBR("2026-01-01")).toBe("01/01/2026");
    expect(formatDateOnlyBR("2026-12-31")).toBe("31/12/2026");
  });

  it("loja: meia-noite local serializada em UTC continua no mesmo dia", () => {
    expect(formatDateOnlyBR("2026-01-01T03:00:00.000Z")).toBe("01/01/2026");
  });

  it("vazio vira travessão; texto inválido passa como está", () => {
    expect(formatDateOnlyBR(null)).toBe("—");
    expect(formatDateOnlyBR(undefined)).toBe("—");
    expect(formatDateOnlyBR("")).toBe("—");
    expect(formatDateOnlyBR("abc")).toBe("abc");
  });
});
