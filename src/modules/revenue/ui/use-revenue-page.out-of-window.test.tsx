import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/tenant/use-required-tenant", () => ({ useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }) }));
vi.mock("@/shared/tenant/tenant-context", () => ({
  useTenant: () => ({ selection: { companyId: "c1", storeId: "s1" } }),
}));
// Backend nuvem: só assim `usePlanHistoryWindow` consulta `/billing/plan-window` de verdade.
vi.mock("@/shared/runtime/runtime-context", () => ({
  useRuntime: () => ({ backend: "cloud", apiDisplayOrigin: "api.example.com", adminPlatformUrl: "https://b" }),
}));

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

const mockedApiRequest = vi.mocked(apiRequest);
const { useRevenuePage } = await import("./use-revenue-page");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useRevenuePage — fora da janela do plano (I2)", () => {
  afterEach(() => vi.clearAllMocks());

  it("Atualizar não consulta a API e avisa o bloqueio, como Comandas/Transações", async () => {
    mockedApiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/billing/plan-window")) {
        // Plano com janela de 7 dias: o período padrão da tela (últimos 30 dias) já nasce fora
        // da janela, então nem a 1ª carga deveria persistir chamando `/dashboard/revenue-approved`
        // depois que a janela do plano é conhecida.
        return { data: { planSlug: "basico", planName: "Básico", historyWindowDays: 7 } };
      }
      // Corrida esperada: antes de `/billing/plan-window` responder, `outOfWindow` começa em
      // `false` (sem limite ainda conhecido) e a 1ª carga do relatório pode disparar uma vez.
      // O que este teste garante é que, depois disso, `refresh()` não chama a API de novo.
      return { data: { byMethod: { credit: { amount: 0, count: 0 }, debit: { amount: 0, count: 0 }, pix: { amount: 0, count: 0 }, voucher: { amount: 0, count: 0 } }, recentApprovedMeta: { offset: 0, limit: 50, hasMore: false } } };
    });

    const { result } = renderHook(() => useRevenuePage(), { wrapper });

    await waitFor(() => expect(result.current.outOfWindow).toBe(true));
    mockedApiRequest.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedApiRequest).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Período fora do plano" }));
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Atualizado" }));
  });
});
