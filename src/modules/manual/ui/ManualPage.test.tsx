import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualPage } from "./ManualPage";

describe("ManualPage", () => {
  it("renderiza o título e as 9 seções do legado, todas fechadas", () => {
    render(<ManualPage />);
    expect(screen.getByRole("heading", { name: "Manual do Sistema" })).toBeInTheDocument();
    const triggers = screen.getAllByRole("button");
    expect(triggers.map((t) => t.textContent)).toEqual([
      "Visão Geral — Arquitetura",
      "Requisitos do Sistema",
      "Instalação do PostgreSQL",
      "Sync Service (Firebird ↔ PostgreSQL)",
      "Instalador do Sync",
      "Configuração do Totem Electron",
      "Rede e Firewall",
      "Serviço TEF (HTTP — Aditum)",
      "Configuração de DNS (Domínio Customizado)",
    ]);
    expect(triggers.every((t) => t.getAttribute("aria-expanded") === "false")).toBe(true);
  });

  it("abre várias seções ao mesmo tempo (type=multiple) e liga o instalador a /wizard", async () => {
    render(<ManualPage />);
    await userEvent.click(screen.getByRole("button", { name: "Visão Geral — Arquitetura" }));
    await userEvent.click(screen.getByRole("button", { name: "Instalador do Sync" }));
    expect(screen.getByText("Fluxo: Totem → PostgreSQL → Sync Service → Firebird (e vice-versa)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir instalador do Sync" })).toHaveAttribute("href", "/wizard");
  });
});
