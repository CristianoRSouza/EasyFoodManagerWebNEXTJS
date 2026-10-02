import { apiRequest } from "@/shared/http/api-client";
import { ApiRevenueRepository } from "./api-revenue-repository";
import type { RevenueReport } from "../domain/revenue";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));

const mockedApiRequest = vi.mocked(apiRequest);

function fakeReport(): RevenueReport {
  return {
    period: { from: "2026-06-01", to: "2026-06-30" },
    byMethod: {
      credit: { amount: 100, count: 2 },
      debit: { amount: 0, count: 0 },
      pix: { amount: 0, count: 0 },
      voucher: { amount: 0, count: 0 },
    },
    total: { amount: 100, count: 2 },
    kpis: { averageTicket: 50, shareCredit: 100, shareDebit: 0, sharePix: 0, shareVoucher: 0, nfceIssuedCount: 1 },
    byHour: [],
    recentApproved: [],
    recentApprovedMeta: { offset: 0, limit: 50, hasMore: false },
    byTotem: [],
    byProductTop10: [],
    byMonthYoY: [],
    byDay: [],
  };
}

describe("ApiRevenueRepository", () => {
  afterEach(() => vi.clearAllMocks());

  it("busca /dashboard/revenue-approved com from/to/recentOffset/recentLimit e o tenant ativo", async () => {
    const report = fakeReport();
    mockedApiRequest.mockResolvedValue({ data: report });
    const repo = new ApiRevenueRepository({ companyId: "c1", storeId: "s1" });

    const result = await repo.report({ from: "2026-06-01", to: "2026-06-30", recentOffset: 0, recentLimit: 50 });

    expect(result).toEqual(report);
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/dashboard/revenue-approved?from=2026-06-01&to=2026-06-30&recentOffset=0&recentLimit=50",
      { tenant: { companyId: "c1", storeId: "s1" } },
    );
  });

  it("servidor anterior ao voucher: completa os campos com zero (legado 1.3.12)", async () => {
    const antigo = fakeReport() as unknown as { byMethod: Record<string, unknown>; kpis: Record<string, unknown> };
    delete antigo.byMethod.voucher;
    delete antigo.kpis.shareVoucher;
    mockedApiRequest.mockResolvedValue({ data: antigo });
    const repo = new ApiRevenueRepository({ companyId: "c1", storeId: "s1" });

    const result = await repo.report({ from: "2026-06-01", to: "2026-06-30", recentOffset: 0, recentLimit: 50 });

    expect(result.byMethod.voucher).toEqual({ amount: 0, count: 0 });
    expect(result.kpis.shareVoucher).toBe(0);
  });

  it("página seguinte: manda o offset pedido", async () => {
    mockedApiRequest.mockResolvedValue({ data: fakeReport() });
    const repo = new ApiRevenueRepository({ companyId: "c1", storeId: "s1" });

    await repo.report({ from: "2026-06-01", to: "2026-06-30", recentOffset: 50, recentLimit: 50 });

    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/dashboard/revenue-approved?from=2026-06-01&to=2026-06-30&recentOffset=50&recentLimit=50",
      { tenant: { companyId: "c1", storeId: "s1" } },
    );
  });
});
