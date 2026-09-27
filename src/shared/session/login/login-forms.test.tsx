import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/shared/http/api-error";
import { Toaster } from "@/shared/ui/primitives/toaster";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams() }));
const sessionClient = { login: vi.fn(), firstAccess: vi.fn(), requestPasswordReset: vi.fn() };
vi.mock("@/shared/session/session-client", () => ({ sessionClient }));

const { LanLoginForm } = await import("./LanLoginForm");
const { CloudLoginForm } = await import("./CloudLoginForm");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("LanLoginForm", () => {
  it("mostra os textos do legado no modo loja", () => {
    render(<LanLoginForm />);
    expect(screen.getByText("Modo Local · Admin API")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bem-vindo de volta" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@local.dev")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("login ok lembra o e-mail e vai para o painel", async () => {
    sessionClient.login.mockResolvedValue({ id: "u1", email: "a@loja.dev" });
    render(<LanLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("ecp_admin_last_email")).toBe("a@loja.dev");
  });

  it("senha local não definida abre o primeiro acesso", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(401, "local_password_not_set", "x"));
    render(<><LanLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "novo@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "qualquer");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { name: "Primeiro acesso" })).toBeInTheDocument();
    expect(screen.getByText("novo@loja.dev")).toBeInTheDocument();
  });

  it("API fora do ar mostra o aviso do legado", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(503, "backend_unreachable", "Não foi possível contactar 127.0.0.1:4080."));
    render(<><LanLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("URL da Admin API inacessível")).toBeInTheDocument();
  });
});

describe("CloudLoginForm", () => {
  it("mostra os textos do legado no modo nuvem", () => {
    render(<CloudLoginForm />);
    expect(screen.getByText("Modo Nuvem · EasyFoodAPI")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("usuário@empresa.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Esqueci a senha" })).toBeInTheDocument();
  });

  it("credencial errada mostra a mensagem do servidor", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(401, "invalid_credentials", "Email ou senha incorretos."));
    render(<><CloudLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Não foi possível entrar")).toBeInTheDocument();
    expect(screen.getByText("Email ou senha incorretos.")).toBeInTheDocument();
  });

  it("recuperar senha envia o e-mail pela API", async () => {
    sessionClient.requestPasswordReset.mockResolvedValue(undefined);
    render(<><CloudLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "Esqueci a senha" }));
    await userEvent.click(await screen.findByRole("button", { name: "Enviar email" }));
    await waitFor(() => expect(sessionClient.requestPasswordReset).toHaveBeenCalledWith("a@b.com"));
    expect(await screen.findByText("Email enviado")).toBeInTheDocument();
  });
});
