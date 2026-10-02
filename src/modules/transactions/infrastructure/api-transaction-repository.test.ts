import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/http/api-client";
import { ApiTransactionRepository } from "./api-transaction-repository";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));

const mockedApiRequest = vi.mocked(apiRequest);
const tenant = { companyId: "c1", storeId: "s1" };

describe("ApiTransactionRepository", () => {
  afterEach(() => vi.clearAllMocks());

  it("list: chama /transactions com from/to e tenant, mapeando as linhas", async () => {
    mockedApiRequest.mockResolvedValue({
      data: [
        { id: "t1", payment_method: "pix", amount: "10", status: "approved", created_at: "2026-01-01" },
      ],
    });

    const repo = new ApiTransactionRepository(tenant);
    const result = await repo.list({ from: "2026-01-01", to: "2026-01-31" });

    expect(mockedApiRequest).toHaveBeenCalledWith("/transactions?from=2026-01-01&to=2026-01-31", { tenant });
    expect(result).toEqual([
      expect.objectContaining({ id: "t1", paymentMethod: "pix", amount: 10, status: "approved" }),
    ]);
  });

  it("list: sem from/to não manda query string", async () => {
    mockedApiRequest.mockResolvedValue({ data: [] });
    const repo = new ApiTransactionRepository(tenant);

    await repo.list({});

    expect(mockedApiRequest).toHaveBeenCalledWith("/transactions", { tenant });
  });

  it("list: resposta sem data vira lista vazia", async () => {
    mockedApiRequest.mockResolvedValue({});
    const repo = new ApiTransactionRepository(tenant);

    expect(await repo.list({})).toEqual([]);
  });

  it("orderBarcodes: monta o mapa id → barcode a partir de /orders", async () => {
    mockedApiRequest.mockResolvedValue({
      data: [
        { id: "o1", barcode: "789" },
        { id: "o2", barcode: "790" },
      ],
    });

    const repo = new ApiTransactionRepository(tenant);
    const result = await repo.orderBarcodes({ from: "2026-01-01", to: "2026-01-31" });

    expect(mockedApiRequest).toHaveBeenCalledWith("/orders?from=2026-01-01&to=2026-01-31", { tenant });
    expect(result).toEqual(
      new Map([
        ["o1", "789"],
        ["o2", "790"],
      ]),
    );
  });

  it("orderBarcodes: comanda sem barcode vira string vazia, não undefined", async () => {
    mockedApiRequest.mockResolvedValue({ data: [{ id: "o1", barcode: null }] });
    const repo = new ApiTransactionRepository(tenant);

    const result = await repo.orderBarcodes({});

    expect(result.get("o1")).toBe("");
  });
});
