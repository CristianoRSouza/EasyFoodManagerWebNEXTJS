import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { SyncRecentEventRow } from "./SyncRecentEventRow";
import type { PanelRecentEvent } from "./sync-events-types";

const failedEvent: PanelRecentEvent = {
  event_id: "ev-1",
  entity_name: "products",
  entity_id: "p-1",
  op: "upsert",
  status: "failed",
  retry_count: 3,
  applied_at: null,
  received_at: "2026-09-30T12:00:00Z",
  apply_error: "",
  payload: { a: 1 },
};

function renderRow(overrides: Partial<Parameters<typeof SyncRecentEventRow>[0]> = {}) {
  const onToggle = vi.fn();
  const onRequeue = vi.fn();
  // `SyncOpBadge` exige um `TooltipProvider` acima (na tela, o `SyncEventsPanel` fornece).
  const utils = render(
    <TooltipProvider>
      <SyncRecentEventRow
        event={failedEvent}
        successStatusKey="applied"
        isOpen={false}
        onToggle={onToggle}
        onRequeue={onRequeue}
        requeueing={false}
        {...overrides}
      />
    </TooltipProvider>,
  );
  const row = utils.container.querySelector<HTMLElement>("[aria-expanded]")!;
  return { ...utils, row, onToggle, onRequeue };
}

describe("SyncRecentEventRow", () => {
  it("o botão Reenfileirar não fica aninhado dentro de outro <button>", () => {
    renderRow();
    const requeue = screen.getByRole("button", { name: "Reenfileirar evento para reprocessar" });
    expect(requeue.parentElement?.closest("button")).toBeNull();
  });

  it("a linha continua acessível como botão expansível (aria-expanded/aria-controls, focável)", () => {
    const { row } = renderRow();
    expect(row).toHaveAttribute("role", "button");
    expect(row).toHaveAttribute("tabindex", "0");
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(row).toHaveAttribute("aria-controls");
    expect(row).toHaveAttribute("data-state", "closed");
  });

  it("clicar na linha alterna", () => {
    const { row, onToggle } = renderRow();
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("clicar em Reenfileirar reenfileira e NÃO alterna a linha", () => {
    const { onToggle, onRequeue } = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Reenfileirar evento para reprocessar" }));
    expect(onRequeue).toHaveBeenCalledWith("ev-1");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("Enter e Espaço na linha focada alternam", () => {
    const { row, onToggle } = renderRow();
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row, { key: " " });
    expect(onToggle).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(row, { key: "a" });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("Enter/Espaço no botão Reenfileirar não alternam a linha", () => {
    const { onToggle } = renderRow();
    const requeue = screen.getByRole("button", { name: "Reenfileirar evento para reprocessar" });
    fireEvent.keyDown(requeue, { key: "Enter" });
    fireEvent.keyDown(requeue, { key: " " });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("aberta: mostra o detalhe ligado por aria-controls", () => {
    const { row } = renderRow({ isOpen: true });
    expect(row).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(row.getAttribute("aria-controls")!);
    expect(panel).toHaveTextContent("ev-1");
  });
});
