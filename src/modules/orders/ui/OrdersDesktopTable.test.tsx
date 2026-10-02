import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "../domain/order";

vi.mock("./OrderTransactionsPanel", () => ({ OrderTransactionsPanel: () => <div>transações</div> }));
vi.mock("./OrderItemImage", () => ({ OrderItemImage: () => null }));

const { OrdersDesktopTable } = await import("./OrdersDesktopTable");

function order(id: string, barcode: string): Order {
  return {
    id,
    barcode,
    customerName: null,
    tableName: "1",
    totemName: null,
    status: "open",
    fbSaleId: null,
    fbCashRegisterId: null,
    syncClosePending: false,
    syncCloseAttempts: 0,
    syncCloseLastError: null,
    syncCloseRequestedAt: null,
    syncClosedToFbAt: null,
    tefCancelFbSaleAlreadyClosed: false,
    tefCancelFbSaleMessage: null,
    createdAt: "2026-09-30T12:00:00Z",
    updatedAt: "2026-09-30T12:00:00Z",
  };
}

function renderTable(expanded: string | null, onToggle = vi.fn()) {
  const utils = render(
    <OrdersDesktopTable
      orders={[order("o-1", "BC-1"), order("o-2", "BC-2")]}
      expanded={expanded}
      onToggle={onToggle}
      getOrderItems={() => []}
      getSubtotal={() => 10}
    />,
  );
  // O `tbody` externo é o primeiro; o do detalhe expandido (itens) fica aninhado.
  const tbody = utils.container.querySelector("tbody")!;
  return { ...utils, tbody, onToggle };
}

describe("OrdersDesktopTable", () => {
  it("renderiza cada comanda como <tr> filho direto do <tbody> (sem <div> envolvendo)", () => {
    const { tbody } = renderTable(null);
    expect(tbody.querySelector(":scope > div")).toBeNull();
    const rows = tbody.querySelectorAll(":scope > tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("BC-1");
    expect(rows[1]).toHaveTextContent("BC-2");
  });

  it("linha expandida: a linha de detalhe também é <tr> filho direto, logo após a comanda", () => {
    const { tbody } = renderTable("o-1");
    expect(tbody.querySelector(":scope > div")).toBeNull();
    const rows = tbody.querySelectorAll(":scope > tr");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Detalhes da comanda");
    expect(rows[2]).toHaveTextContent("BC-2");
  });

  it("preserva as bordas do legado (onde o `div.contents` fazia de cada grupo um :last-child)", () => {
    // Recolhida: a linha fecha o grupo → sem borda nenhuma (nem a base `border-b`, nem `border-l-4`).
    const collapsed = renderTable(null);
    const [first] = collapsed.tbody.querySelectorAll(":scope > tr");
    expect(first).toHaveClass("border-0");
    expect(first).not.toHaveClass("border-b");
    expect(first).not.toHaveClass("border-l-4");
    collapsed.unmount();

    // Expandida: a comanda mantém `border-b` + `border-l-4`; o detalhe (último do grupo) fica sem borda.
    const { tbody } = renderTable("o-1");
    const [main, detail] = tbody.querySelectorAll(":scope > tr");
    expect(main).toHaveClass("border-b", "border-l-4", "border-l-primary");
    expect(main).not.toHaveClass("border-0");
    expect(detail).toHaveClass("border-0");
    expect(detail).not.toHaveClass("border-b");
  });

  it("clicar na linha chama onToggle com o id da comanda", () => {
    const { onToggle } = renderTable(null);
    fireEvent.click(screen.getByText("BC-2"));
    expect(onToggle).toHaveBeenCalledWith("o-2");
  });
});
