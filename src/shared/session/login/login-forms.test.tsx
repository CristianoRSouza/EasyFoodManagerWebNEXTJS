import type { ReactElement, ReactNode } from "react";
import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/shared/http/api-error";
import { Toaster } from "@/shared/ui/primitives/toaster";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams() }));
const sessionClient = { login: vi.fn(), firstAccess: vi.fn(), requestPasswordReset: vi.fn() };
vi.mock("@/shared/session/session-client", () => ({ sessionClient }));

const { LanLoginForm } = await import("./LanLoginForm");
const { CloudLoginForm } = await import("./CloudLoginForm");

let queryClient: QueryClient;
const render = (ui: ReactElement) =>
  renderUi(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
/** Dados do usuário anterior que não podem sobreviver a um novo login na mesma aba. */
const seedPreviousUserCache = () => queryClient.setQueryData(["tenant", "companies"], [{ id: "empresa-anterior" }]);
const cacheIsEmpty = () => queryClient.getQueryCache().getAll().length === 0;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  queryClient = new QueryClient();
});

describe("LanLoginForm", () => {
  it("apaga senha legada deixada no navegador por versões antigas", () => {
    localStorage.setItem("ecp_admin_password", "segredo-antigo");
    render(<LanLoginForm />);
    expect(localStorage.getItem("ecp_admin_password")).toBeNull();
  });

  it("mostra os textos do legado no modo loja", () => {
    render(<LanLoginForm />);
    expect(screen.getByText("Modo Local · Admin API")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bem-vindo de volta" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@local.dev")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("login ok lembra o e-mail, esvazia o cache e vai para o painel", async () => {
    sessionClient.login.mockResolvedValue({ id: "u1", email: "a@loja.dev" });
    seedPreviousUserCache();
    render(<LanLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(cacheIsEmpty()).toBe(true);
    expect(localStorage.getItem("ecp_admin_last_email")).toBe("a@loja.dev");
  });

  it("primeiro acesso concluído esvazia o cache antes de ir para o painel", async () => {
    sessionClient.login.mockRejectedValueOnce(new ApiError(401, "local_password_not_set", "x"));
    sessionClient.firstAccess.mockResolvedValue(undefined);
    sessionClient.login.mockResolvedValueOnce({ id: "u1", email: "novo@loja.dev" });
    seedPreviousUserCache();
    render(<><LanLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "novo@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "qualquer");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await userEvent.type(await screen.findByLabelText("Nova senha local"), "segredo1");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "segredo1");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar senha" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(cacheIsEmpty()).toBe(true);
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

  it("login ok esvazia o cache e vai para o painel", async () => {
    sessionClient.login.mockResolvedValue({ id: "u1", email: "a@b.com" });
    seedPreviousUserCache();
    render(<CloudLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(cacheIsEmpty()).toBe(true);
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
