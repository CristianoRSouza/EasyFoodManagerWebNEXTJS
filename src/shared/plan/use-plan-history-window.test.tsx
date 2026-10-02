import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { usePlanHistoryWindow } from "./use-plan-history-window";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/runtime/runtime-context", () => ({ useRuntime: vi.fn() }));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: vi.fn() }));

const mockedApiRequest = vi.mocked(apiRequest);
const mockedUseRuntime = vi.mocked(useRuntime);
const mockedUseTenant = vi.mocked(useTenant);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("usePlanHistoryWindow", () => {
  afterEach(() => vi.clearAllMocks());

  it("nuvem: busca a janela em /billing/plan-window com o tenant ativo", async () => {
    mockedUseRuntime.mockReturnValue({ backend: "cloud", apiDisplayOrigin: "x", adminPlatformUrl: "https://b" });
    mockedUseTenant.mockReturnValue({ selection: { companyId: "c1", storeId: "s1" } } as ReturnType<typeof useTenant>);
    mockedApiRequest.mockResolvedValue({
      data: { planSlug: "ecp-standard", planName: "Standard", historyWindowDays: 90 },
    });

    const { result } = renderHook(() => usePlanHistoryWindow(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ planSlug: "ecp-standard", planName: "Standard", historyWindowDays: 90 });
    expect(mockedApiRequest).toHaveBeenCalledWith("/billing/plan-window", {
      tenant: { companyId: "c1", storeId: "s1" },
    });
  });

  it("loja (LAN): não chama a API e devolve sem limite", async () => {
    mockedUseRuntime.mockReturnValue({ backend: "lan", apiDisplayOrigin: "x", adminPlatformUrl: "https://b" });
    mockedUseTenant.mockReturnValue({ selection: { companyId: "cL", storeId: "sL" } } as ReturnType<typeof useTenant>);

    const { result } = renderHook(() => usePlanHistoryWindow(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ planSlug: null, planName: null, historyWindowDays: null });
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it("nuvem sem loja selecionada ainda: fica desabilitada sem chamar a API", () => {
    mockedUseRuntime.mockReturnValue({ backend: "cloud", apiDisplayOrigin: "x", adminPlatformUrl: "https://b" });
    mockedUseTenant.mockReturnValue({ selection: null } as ReturnType<typeof useTenant>);

    const { result } = renderHook(() => usePlanHistoryWindow(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });
});
