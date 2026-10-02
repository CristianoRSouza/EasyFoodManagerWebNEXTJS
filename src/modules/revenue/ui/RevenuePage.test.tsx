import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import type { RevenueReport } from "../domain/revenue";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/tenant/use-required-tenant", () => ({ useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }) }));
vi.mock("@/shared/tenant/tenant-context", () => ({
  useTenant: () => ({ selection: { companyId: "c1", storeId: "s1" } }),
}));
vi.mock("@/shared/runtime/runtime-context", () => ({
  useRuntime: () => ({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" }),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const { RevenuePage } = await import("./RevenuePage");

function emptyReport(): RevenueReport {
  return {
    period: { from: "2026-06-01", to: "2026-06-30" },
    byMethod: {
      credit: { amount: 0, count: 0 },
      debit: { amount: 0, count: 0 },
      pix: { amount: 0, count: 0 },
      voucher: { amount: 0, count: 0 },
    },
    total: { amount: 0, count: 0 },
    kpis: { averageTicket: 0, shareCredit: 0, shareDebit: 0, sharePix: 0, shareVoucher: 0, nfceIssuedCount: 0 },
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, "0")}h`, credit: 0, debit: 0, pix: 0, voucher: 0, total: 0 })),
    recentApproved: [],
    recentApprovedMeta: { offset: 0, limit: 50, hasMore: false },
    byTotem: [],
    byProductTop10: [],
    byMonthYoY: [],
    byDay: [],
  };
}

function reportWithData(): RevenueReport {
  return {
    ...emptyReport(),
    byMethod: {
      credit: { amount: 600, count: 3 },
      debit: { amount: 300, count: 2 },
      pix: { amount: 100, count: 1 },
      voucher: { amount: 0, count: 0 },
    },
    total: { amount: 1000, count: 6 },
    kpis: { averageTicket: 166.67, shareCredit: 60, shareDebit: 30, sharePix: 10, shareVoucher: 0, nfceIssuedCount: 4 },
    recentApproved: [
      { id: "t1", created_at: "2026-06-15T10:00:00Z", payment_method: "credit", amount: 100 },
      { id: "t2", created_at: "2026-06-15T11:00:00Z", payment_method: "pix", amount: 100 },
    ],
    recentApprovedMeta: { offset: 0, limit: 50, hasMore: false },
    byDay: [{ day: "2026-06-15", label: "15/06", credit: 600, debit: 300, pix: 100, voucher: 0, total: 1000 }],
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RevenuePage />
    </QueryClientProvider>,
  );
}

describe("RevenuePage", () => {
  afterEach(() => vi.clearAllMocks());

  it("carregando: mostra o cabeçalho e os esqueletos, sem os KPIs ainda", () => {
    mockedApiRequest.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("heading", { name: "Receitas" })).toBeInTheDocument();
    expect(screen.queryByText("Total no período")).toBeNull();
  });

  it("vazio: período sem transações aprovadas mostra os KPIs zerados e a mensagem de tabela vazia", async () => {
    mockedApiRequest.mockResolvedValue({ data: emptyReport() });
    renderPage();

    await waitFor(() => expect(screen.getByText("Total no período")).toBeInTheDocument());
    expect(screen.getByText("Nenhuma transação neste intervalo.")).toBeInTheDocument();
    expect(screen.getByText("Sem transações aprovadas neste intervalo.")).toBeInTheDocument();
  });

  it("erro: mostra a faixa de erro quando a API falha", async () => {
    mockedApiRequest.mockRejectedValue(new Error("Falha ao consultar receitas"));
    renderPage();

    await waitFor(() => expect(screen.getByText("Falha ao consultar receitas")).toBeInTheDocument());
  });

  it("com dados: mostra os totais por método e as transações recentes", async () => {
    mockedApiRequest.mockResolvedValue({ data: reportWithData() });
    renderPage();

    await waitFor(() => expect(screen.getByText("Total no período")).toBeInTheDocument());
    expect(screen.getByText(/R\$\s?1\.000,00/)).toBeInTheDocument();
    expect(screen.getByText("6 transação(ões) aprovada(s)")).toBeInTheDocument();
    expect(screen.getByText("t1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeEnabled();
  });
});
