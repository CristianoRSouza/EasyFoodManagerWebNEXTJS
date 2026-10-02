import { describe, expect, it, vi } from "vitest";
import { ApiBootstrapCodeRepository } from "./api-bootstrap-code-repository";
import { ApiError } from "@/shared/http/api-error";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "company-1", storeId: "store-1" };

describe("ApiBootstrapCodeRepository", () => {
  it("chama POST /stores/{storeId}/bootstrap-code com o email normalizado e o tenant", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      ok: true,
      code: "EFB1.abc.def",
      email: "funcionario@empresa.com",
      store_id: "store-1",
      expires_at: "2026-10-01T12:00:00Z",
    });

    const repository = new ApiBootstrapCodeRepository(tenant);
    const result = await repository.issue({ email: "  Funcionario@Empresa.COM  " });

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/stores/store-1/bootstrap-code", {
      method: "POST",
      body: { email: "funcionario@empresa.com" },
      tenant,
    });
    expect(result).toEqual({
      ok: true,
      code: "EFB1.abc.def",
      email: "funcionario@empresa.com",
      storeId: "store-1",
      expiresAt: "2026-10-01T12:00:00Z",
      error: undefined,
    });
  });

  it("inclui ttl_hours no corpo só quando informado", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ ok: true, code: "x", store_id: "store-1" });

    const repository = new ApiBootstrapCodeRepository(tenant);
    await repository.issue({ email: "a@b.com", ttlHours: 24 });

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/stores/store-1/bootstrap-code",
      expect.objectContaining({ body: { email: "a@b.com", ttl_hours: 24 } }),
    );
  });

  it("resposta 200 com ok:false passa direto (recusa do servidor, não é erro de transporte)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      ok: false,
      error: "Email não pertence a esta loja.",
    });

    const repository = new ApiBootstrapCodeRepository(tenant);
    const result = await repository.issue({ email: "a@b.com" });

    expect(result).toEqual({
      ok: false,
      code: undefined,
      email: undefined,
      storeId: undefined,
      expiresAt: undefined,
      error: "Email não pertence a esta loja.",
    });
  });

  it("ApiError lançado (ex.: 403/500) vira { ok:false, error: mensagem }", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new ApiError(403, "forbidden", "Apenas administradores podem gerar códigos."));

    const repository = new ApiBootstrapCodeRepository(tenant);
    const result = await repository.issue({ email: "a@b.com" });

    expect(result).toEqual({ ok: false, error: "Apenas administradores podem gerar códigos." });
  });

  it("erro de rede (não ApiError) vira a mensagem genérica do legado", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error("boom"));

    const repository = new ApiBootstrapCodeRepository(tenant);
    const result = await repository.issue({ email: "a@b.com" });

    expect(result).toEqual({ ok: false, error: "Falha ao gerar o código." });
  });
});
