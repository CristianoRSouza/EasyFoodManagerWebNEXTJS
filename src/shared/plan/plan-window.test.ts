import { isPeriodOutsidePlanWindow, minAllowedYmd } from "./plan-window";

describe("minAllowedYmd", () => {
  const today = new Date(2026, 6, 15); // 15/07/2026 local

  it("sem janela (null ou 0): sem data mínima", () => {
    expect(minAllowedYmd(null, today)).toBeNull();
    expect(minAllowedYmd(0, today)).toBeNull();
  });

  it("janela de 30 dias: mínimo é hoje - 29 dias", () => {
    expect(minAllowedYmd(30, today)).toBe("2026-06-16");
  });
});

describe("isPeriodOutsidePlanWindow", () => {
  it("sem data mínima nunca bloqueia", () => {
    expect(isPeriodOutsidePlanWindow(null, "all", "")).toBe(false);
  });

  it("\"Todos\" ou início vazio bloqueiam quando há janela", () => {
    expect(isPeriodOutsidePlanWindow("2026-06-16", "all", "2026-07-01")).toBe(true);
    expect(isPeriodOutsidePlanWindow("2026-06-16", "custom", "")).toBe(true);
  });

  it("bloqueia só início anterior à data mínima", () => {
    expect(isPeriodOutsidePlanWindow("2026-06-16", "custom", "2026-06-15")).toBe(true);
    expect(isPeriodOutsidePlanWindow("2026-06-16", "custom", "2026-06-16")).toBe(false);
    expect(isPeriodOutsidePlanWindow("2026-06-16", "30d", "2026-07-01")).toBe(false);
  });
});
