import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiBillingRepository } from "./api-billing-repository";

afterEach(() => vi.restoreAllMocks());

describe("ApiBillingRepository", () => {
  it("GET /billing/license com empresa/loja nos cabeçalhos", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { state: "expired", planSlug: "p", planName: "Plano", expiresAt: null, isActive: false, daysUntilExpiry: null },
        }),
      ),
    );
    const status = await new ApiBillingRepository({ companyId: "c1", storeId: "s1" }).licenseStatus();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe("/api/v1/billing/license");
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
    expect(status).toMatchObject({ state: "expired", planName: "Plano", isActive: false });
  });

  it("erro do servidor propaga (a query fica em erro e nenhum aviso aparece)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "x" }), { status: 500 }));
    await expect(new ApiBillingRepository({ companyId: "c1", storeId: "s1" }).licenseStatus()).rejects.toMatchObject({
      status: 500,
    });
  });
});
