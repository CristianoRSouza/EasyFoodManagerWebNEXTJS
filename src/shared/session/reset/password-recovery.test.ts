const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { updateUser } })),
}));

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function configured() {
    const mod = await import("./password-recovery");
    // Nunca reais: só existem para o SupabaseClient mockado conseguir "construir".
    mod.configureRecoverySupabase({ url: "https://example.invalid.test", publishableKey: "dummy-publishable-key" });
    return mod;
  }

  it("usa o Supabase do ambiente entregue pelo servidor (não o do build)", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const { updatePassword, configureRecoverySupabase } = await import("./password-recovery");
    configureRecoverySupabase({ url: "https://homolog.invalid.test", publishableKey: "chave-homolog" });
    updateUser.mockResolvedValue({ error: null });
    await updatePassword("novasenha1");
    expect(createClient).toHaveBeenCalledWith("https://homolog.invalid.test", "chave-homolog", expect.anything());
  });

  it("sem Supabase configurado no servidor, falha com mensagem clara", async () => {
    const { updatePassword, configureRecoverySupabase } = await import("./password-recovery");
    configureRecoverySupabase(null);
    await expect(updatePassword("novasenha1")).rejects.toThrow(/SUPABASE_URL/);
  });

  it("traduz uma mensagem de erro conhecida do Supabase para PT-BR (mesmo mapeamento do legado)", async () => {
    const { updatePassword } = await configured();
    updateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password." },
    });

    await expect(updatePassword("novasenha1")).rejects.toThrow("A nova senha deve ser diferente da anterior.");
  });

  it("mensagem desconhecida cai no fallback em PT-BR do legado, nunca no texto original", async () => {
    const { updatePassword } = await configured();
    updateUser.mockResolvedValue({
      error: { message: "Some totally unmapped supabase error that nobody expects" },
    });

    await expect(updatePassword("novasenha1")).rejects.toThrow("Falha ao atualizar senha");
  });
});
