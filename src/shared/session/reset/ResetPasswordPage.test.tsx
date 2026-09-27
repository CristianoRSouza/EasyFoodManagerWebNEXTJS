import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "@/shared/ui/primitives/toaster";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const recovery = { verifyRecoveryToken: vi.fn(), adoptRecoverySession: vi.fn(), updatePassword: vi.fn() };
vi.mock("./password-recovery", async (original) => ({ ...(await original<object>()), ...recovery }));

const { ResetPasswordPage } = await import("./ResetPasswordPage");
const { readRecoveryLink } = await import("./password-recovery");

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/reset-password");
});

describe("readRecoveryLink", () => {
  it("reconhece o link novo com token_hash", () => {
    expect(readRecoveryLink("?type=recovery&token_hash=abc", "")).toEqual({ kind: "token_hash", tokenHash: "abc" });
  });
  it("reconhece o link antigo com a sessão no hash", () => {
    expect(readRecoveryLink("", "#type=recovery&access_token=a&refresh_token=r")).toEqual({ kind: "session", accessToken: "a", refreshToken: "r" });
  });
  it("sem link de recuperação devolve null", () => {
    expect(readRecoveryLink("", "")).toBeNull();
  });
});

describe("ResetPasswordPage", () => {
  it("sem link mostra 'Link inválido ou expirado.'", async () => {
    render(<ResetPasswordPage />);
    expect(await screen.findByText("Link inválido ou expirado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao login" }));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("link válido permite gravar a nova senha", async () => {
    window.history.replaceState({}, "", "/reset-password?type=recovery&token_hash=abc");
    recovery.verifyRecoveryToken.mockResolvedValue(true);
    recovery.updatePassword.mockResolvedValue(undefined);
    render(<><ResetPasswordPage /><Toaster /></>);
    await userEvent.type(await screen.findByLabelText("Nova senha"), "novasenha1");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "novasenha1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nova senha" }));
    await waitFor(() => expect(recovery.updatePassword).toHaveBeenCalledWith("novasenha1"));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("senha curta é recusada antes de chamar o Supabase", async () => {
    window.history.replaceState({}, "", "/reset-password?type=recovery&token_hash=abc");
    recovery.verifyRecoveryToken.mockResolvedValue(true);
    render(<><ResetPasswordPage /><Toaster /></>);
    await userEvent.type(await screen.findByLabelText("Nova senha"), "123");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nova senha" }));
    expect(await screen.findByText("Senha fraca")).toBeInTheDocument();
    expect(recovery.updatePassword).not.toHaveBeenCalled();
  });
});
