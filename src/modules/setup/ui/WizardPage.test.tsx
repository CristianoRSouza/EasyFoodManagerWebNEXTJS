import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "@/shared/ui/primitives/toaster";
import { WizardPage } from "./WizardPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderPage() {
  return render(
    <>
      <WizardPage />
      <Toaster />
    </>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("WizardPage", () => {
  it("começa no passo 1, com Anterior desabilitado", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Wizard de Instalação" })).toBeInTheDocument();
    expect(screen.getByText("Pré-requisitos", { selector: "h3,div" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
    expect(screen.getByText("Node.js 20+ LTS")).toBeInTheDocument();
  });

  it("Próximo/stepper navegam; o .env gerado acompanha os campos", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /3\s*Conexões/ }));
    expect(screen.getByText("Conexão Firebird")).toBeInTheDocument();
    const pre = screen.getByText(/# Firebird/);
    expect(pre.textContent).toContain('FB_PASSWORD="masterkey"');
    const ipInput = screen.getByPlaceholderText("192.168.0.100");
    await userEvent.clear(ipInput);
    await userEvent.type(ipInput, "10.0.0.5");
    expect(screen.getByText(/# Firebird/).textContent).toContain("SERVER_IP=10.0.0.5");
  });

  it("último passo desabilita Próximo", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /7\s*Confirmação/ }));
    expect(screen.getByText("Instalação Concluída!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Ir para o Dashboard" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("copiar usa a área de transferência e avisa", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPage();
    const copyButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await userEvent.click(copyButtons[copyButtons.length - 1]!);
    expect(writeText).toHaveBeenCalledWith("git clone https://github.com/NeanderEasySoft/easy-command-pay.git");
    expect(await screen.findByText("Copiado!")).toBeInTheDocument();
  });

  it("IBConfig.INI preenche os caminhos dos bancos", async () => {
    const { container } = renderPage();
    await userEvent.click(screen.getByRole("button", { name: /2\s*Bancos de Dados/ }));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["[Config]\r\nPath=C:\\D\\NOVO.FDB\r\nPath_Midia=C:\\D\\MID.FDB\r\n"], "IBConfig.INI");
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByDisplayValue("C:\\D\\NOVO.FDB")).toBeInTheDocument());
    expect(screen.getByDisplayValue("C:\\D\\MID.FDB")).toBeInTheDocument();
    expect(await screen.findByText("IBConfig.INI carregado!")).toBeInTheDocument();
  });
});
