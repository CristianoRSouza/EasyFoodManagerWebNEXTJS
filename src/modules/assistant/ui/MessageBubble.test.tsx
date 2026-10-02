import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderAssistant(content: string, onNavigate = vi.fn()) {
  const view = render(<MessageBubble msg={{ role: "assistant", content }} onNavigate={onNavigate} />);
  return { ...view, onNavigate, prose: view.container.querySelector(".prose") as HTMLElement };
}

describe("MessageBubble — markdown pelo react-markdown + remark-gfm (igual ao legado)", () => {
  it("parágrafo, negrito e lista compacta", () => {
    const { prose } = renderAssistant("Olá **Ana**!\n\n- um\n- dois");
    expect(prose.innerHTML).toBe("<p>Olá <strong>Ana</strong>!</p>\n<ul>\n<li>um</li>\n<li>dois</li>\n</ul>");
  });

  it("GFM: tabela e riscado", () => {
    const { prose } = renderAssistant("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~velho~~");
    expect(prose.querySelector("table td")?.textContent).toBe("1");
    expect(prose.querySelector("del")?.textContent).toBe("velho");
  });

  it("link externo abre em nova aba; interno navega pelo router e fecha o painel", () => {
    const { onNavigate } = renderAssistant("[site](https://x.com) e [Comandas](/orders)");
    const site = screen.getByRole("link", { name: "site" });
    expect(site).toHaveAttribute("target", "_blank");
    expect(site).toHaveAttribute("rel", "noopener noreferrer");
    const internal = screen.getByRole("link", { name: "Comandas" });
    expect(internal).not.toHaveAttribute("target");
    fireEvent.click(internal);
    expect(push).toHaveBeenCalledWith("/orders");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("HTML cru é descartado (react-markdown sem rehype-raw)", () => {
    const { prose } = renderAssistant("<img src=x onerror=alert(1)>");
    expect(prose.querySelector("img")).toBeNull();
  });

  it("mensagem do usuário continua texto puro", () => {
    render(<MessageBubble msg={{ role: "user", content: "**não** é markdown" }} onNavigate={vi.fn()} />);
    expect(screen.getByText("**não** é markdown")).toBeInTheDocument();
  });
});
