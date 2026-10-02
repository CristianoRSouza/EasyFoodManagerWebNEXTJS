import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import type { RevenueReport, RevenueTransactionRow } from "../domain/revenue";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/tenant/use-required-tenant", () => ({ useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }) }));
vi.mock("@/shared/tenant/tenant-context", () => ({
  useTenant: () => ({ selection: { companyId: "c1", storeId: "s1" } }),
}));
vi.mock("@/shared/runtime/runtime-context", () => ({
  useRuntime: () => ({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" }),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const { useRevenuePage } = await import("./use-revenue-page");

function row(id: string): RevenueTransactionRow {
  return { id, created_at: "2026-06-15T10:00:00Z", payment_method: "credit", amount: 10 };
}

/** Uma página de `recentApproved` por offset: `t0` no offset 0 (com mais), `t1` no offset 1 (fim). */
function page(offset: number): RevenueReport {
  return {
    period: { from: "2026-06-01", to: "2026-06-30" },
    byMethod: { credit: { amount: 20, count: 2 }, debit: { amount: 0, count: 0 }, pix: { amount: 0, count: 0 }, voucher: { amount: 0, count: 0 } },
    total: { amount: 20, count: 2 },
    kpis: { averageTicket: 10, shareCredit: 100, shareDebit: 0, sharePix: 0, shareVoucher: 0, nfceIssuedCount: 0 },
    byHour: [],
    recentApproved: [row(`t${offset}`)],
    recentApprovedMeta: { offset, limit: 1, hasMore: offset === 0 },
    byTotem: [],
    byProductTop10: [],
    byMonthYoY: [],
    byDay: [],
  };
}

function offsetOf(path: string): number {
  return Number(new URLSearchParams(path.split("?")[1]).get("recentOffset"));
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRevenuePage — Atualizar dados", () => {
  afterEach(() => vi.clearAllMocks());

  it("recarrega só a 1ª página de transações recentes, descartando as roladas (igual ao legado)", async () => {
    mockedApiRequest.mockImplementation(async (path: string) => ({ data: page(offsetOf(path)) }));
    const { result } = renderHook(() => useRevenuePage(), { wrapper });

    await waitFor(() => expect(result.current.recentRows.map((r) => r.id)).toEqual(["t0"]));
    act(() => result.current.loadMoreRecent());
    await waitFor(() => expect(result.current.recentRows.map((r) => r.id)).toEqual(["t0", "t1"]));

    mockedApiRequest.mockClear();
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    expect(offsetOf(mockedApiRequest.mock.calls[0]![0])).toBe(0);
    expect(result.current.recentRows.map((r) => r.id)).toEqual(["t0"]);
    expect(result.current.recentHasMore).toBe(true);
  });

  it("falha ao atualizar vira erro na tela, não exceção", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: page(0) });
    const { result } = renderHook(() => useRevenuePage(), { wrapper });
    await waitFor(() => expect(result.current.report).not.toBeNull());

    mockedApiRequest.mockRejectedValueOnce(new Error("Falha ao consultar receitas"));
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("Falha ao consultar receitas");
  });
});
