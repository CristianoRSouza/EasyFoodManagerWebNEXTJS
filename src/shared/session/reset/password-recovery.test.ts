const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { updateUser } })),
}));

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Nunca reais: só existem para o SupabaseClient mockado conseguir "construir".
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "dummy-publishable-key";
  });

  it("traduz uma mensagem de erro conhecida do Supabase para PT-BR (mesmo mapeamento do legado)", async () => {
    const { updatePassword } = await import("./password-recovery");
    updateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password." },
    });

    await expect(updatePassword("novasenha1")).rejects.toThrow("A nova senha deve ser diferente da anterior.");
  });

  it("mensagem desconhecida cai no fallback em PT-BR do legado, nunca no texto original", async () => {
    const { updatePassword } = await import("./password-recovery");
    updateUser.mockResolvedValue({
      error: { message: "Some totally unmapped supabase error that nobody expects" },
    });

    await expect(updatePassword("novasenha1")).rejects.toThrow("Falha ao atualizar senha");
  });
});
