import { bootstrapErrorMessage } from "./login-messages";

describe("bootstrapErrorMessage", () => {
  it("usa o texto do legado para cada código conhecido", () => {
    expect(bootstrapErrorMessage("user_not_found", "x")).toBe(
      "Este email não existe nesta base local ou a conta ainda não foi sincronizada.",
    );
    expect(bootstrapErrorMessage("weak_password", "x")).toBe("Senha não cumpre os requisitos (≥ 6 caracteres).");
    expect(bootstrapErrorMessage("provisioning_code_expired", "x")).toBe(
      "Código de primeiro acesso expirado. Peça um novo ao administrador.",
    );
  });

  it("código desconhecido usa a mensagem do servidor", () => {
    expect(bootstrapErrorMessage("outro", "Mensagem do servidor")).toBe("Mensagem do servidor");
    expect(bootstrapErrorMessage(undefined, "Mensagem do servidor")).toBe("Mensagem do servidor");
  });
});
