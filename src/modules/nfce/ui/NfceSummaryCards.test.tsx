import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NfceSummaryCards } from "./NfceSummaryCards";
import type { NfceTotals } from "../domain/nfce-note";

/**
 * Os cards do topo da tela de NFC-e.
 *
 * A regressão que estes testes existem para impedir: os cards eram derivados das linhas da
 * TABELA. Como a tela carrega 50 por vez, um filtro com 1.164 notas mostrava "50 autorizadas" e
 * somava o valor de apenas 50 — sem nenhum sinal de que faltava o resto. Card de resumo é onde o
 * usuário confere faturamento; errado ali é pior que ausente.
 */

function totals(partial: Partial<NfceTotals> = {}): NfceTotals {
  return { total: 0, byStatus: {}, authorizedAmount: 0, ...partial };
}

/** O número mostrado no card de rótulo `label`. */
function cardValue(label: string): string {
  const heading = screen.getByText(label);
  return heading.parentElement?.querySelector("p:last-child")?.textContent ?? "";
}

describe("cards de resumo da NFC-e", () => {
  it("mostra o total do PERÍODO, não o que a tabela carregou", () => {
    render(
      <NfceSummaryCards
        totals={totals({ total: 1164, byStatus: { authorized: 1100, rejected: 23, cancelled: 41 }, authorizedAmount: 25130.45 })}
        dateFrom="2026-07-01"
        dateTo="2026-07-31"
      />,
    );

    expect(cardValue("Autorizadas")).toBe("1100");
    expect(cardValue("Rejeitadas")).toBe("23");
    expect(cardValue("Canceladas")).toBe("41");
    expect(cardValue("Valor autorizado")).toContain("25.130,45");
  });

  it("dobra o apelido do banco: `inutilizada` conta como `inutilized`", () => {
    render(<NfceSummaryCards totals={totals({ byStatus: { inutilizada: 3, inutilized: 2 } })} />);
    expect(cardValue("Inutilizadas")).toBe("5");
  });

  it("`Inutilizadas` NÃO conta contingência pendente — o rótulo diz outra coisa", () => {
    render(<NfceSummaryCards totals={totals({ byStatus: { unusable: 7 } })} />);
    expect(cardValue("Inutilizadas")).toBe("0");
  });

  it("status desconhecido não vira `authorized` por descuido", () => {
    render(<NfceSummaryCards totals={totals({ byStatus: { manual_review: 190, draft: 4 } })} />);
    expect(cardValue("Autorizadas")).toBe("0");
    expect(cardValue("Rejeitadas")).toBe("0");
  });

  it("soma só o que o status manda — dinheiro vem pronto do banco", () => {
    render(<NfceSummaryCards totals={totals({ authorizedAmount: 1078.02 })} />);
    expect(cardValue("Valor autorizado")).toContain("1.078,02");
  });

  it("enquanto carrega mostra travessão, nunca zero", () => {
    render(<NfceSummaryCards totals={null} />);
    expect(cardValue("Autorizadas")).toBe("—");
    expect(cardValue("Valor autorizado")).toBe("—");
  });

  it("o card de período mostra o intervalo filtrado", () => {
    render(<NfceSummaryCards totals={totals()} dateFrom="2026-07-01" dateTo="2026-07-31" />);
    expect(cardValue("Período")).toContain("31/07");
  });

  it("sem intervalo, o período é `Todos`", () => {
    render(<NfceSummaryCards totals={totals()} />);
    expect(cardValue("Período")).toBe("Todos");
  });
});
