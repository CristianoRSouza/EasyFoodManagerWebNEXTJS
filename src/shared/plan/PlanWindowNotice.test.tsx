import { fireEvent, render, screen } from "@testing-library/react";
import { PlanWindowNotice } from "./PlanWindowNotice";

function renderNotice(overrides: Partial<Parameters<typeof PlanWindowNotice>[0]> = {}) {
  const props = {
    planWindow: { planSlug: "basico", planName: "Básico", historyWindowDays: 30 },
    blockedMessage: "A consulta de comandas foi bloqueada para este intervalo.",
    adjustHint: "Ajuste o período (data início) para uma data igual ou posterior.",
    minAllowedYmd: "2026-06-16",
    minAllowedLabel: "16/06/2026",
    onAdjust: vi.fn(),
    onOpenBilling: vi.fn(),
    billingLoading: false,
    ...overrides,
  };
  render(<PlanWindowNotice {...props} />);
  return props;
}

describe("PlanWindowNotice", () => {
  it("mostra o plano, a janela e o que foi bloqueado, no texto do legado", () => {
    renderNotice();
    expect(screen.getByText("Período fora do seu plano")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent ===
          "O plano Básico permite consultar até 30 dias de histórico. A consulta de comandas foi bloqueada para este intervalo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("16/06/2026")).toBeInTheDocument();
  });

  it("sem nome de plano usa o slug; sem os dois, \"atual\"", () => {
    renderNotice({ planWindow: { planSlug: null, planName: null, historyWindowDays: 7 } });
    expect(screen.getByText("atual")).toBeInTheDocument();
  });

  it("ajustar e upgrade chamam as ações", () => {
    const props = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Ajustar para 16/06/2026" }));
    fireEvent.click(screen.getByRole("button", { name: /Fazer upgrade do plano/ }));
    expect(props.onAdjust).toHaveBeenCalledTimes(1);
    expect(props.onOpenBilling).toHaveBeenCalledTimes(1);
  });

  it("sem data mínima não oferece o ajuste", () => {
    renderNotice({ minAllowedYmd: null });
    expect(screen.queryByRole("button", { name: /Ajustar para/ })).toBeNull();
  });
});
