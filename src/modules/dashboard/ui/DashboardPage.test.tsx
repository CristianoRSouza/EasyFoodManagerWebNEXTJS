import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./DashboardPage";
import * as snapshotQueryModule from "./use-dashboard-snapshot-query";
import { EMPTY_DASHBOARD_SNAPSHOT, type DashboardSnapshot } from "../domain/dashboard-snapshot";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

// jsdom não implementa ResizeObserver; o `ResponsiveContainer` do recharts precisa dele para
// medir o container antes de desenhar. Polyfill local — não é global do harness (vitest.setup.ts
// é compartilhado entre módulos, fora do escopo desta tela).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

const LAN_RUNTIME: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "192.168.0.10:3001", adminPlatformUrl: "" };
const CLOUD_RUNTIME: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.easysoftcloud.com.br", adminPlatformUrl: "" };

const FULL_SNAPSHOT: DashboardSnapshot = {
  stats: {
    activeProducts: 42,
    openOrders: 5,
    todayTransactions: 17,
    recentErrors: 2,
    lastSuccessSync: { createdAt: "2024-01-01T10:00:00Z" },
    serviceHeartbeats: { sync: "2024-01-01T10:05:00Z", nfce: null, tef: null, syncPgSb: null, pixPixnopdv: null },
  },
  syncByHour: [{ hour: "01/01 10:00", ok: 5, error: 1 }],
  transactionsByDay: [{ day: "01/01", total: 3, amount: 150.5 }],
  recentErrors: [
    { id: "1", direction: "fb_to_pg", tableName: "orders", status: "error", errorMessage: "timeout na conexão", createdAt: "2024-01-01T09:00:00Z" },
  ],
  nfceAttention: { manualReview: 2, reconcileFailed: 1, unusable: 0 },
  failedParts: [],
};

function renderWithProviders(runtime: RuntimeInfo) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={runtime}>
        <DashboardPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

function mockSnapshotQuery(overrides: Partial<ReturnType<typeof snapshotQueryModule.useDashboardSnapshotQuery>>) {
  vi.spyOn(snapshotQueryModule, "useDashboardSnapshotQuery").mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ isError: false }),
    ...overrides,
  } as ReturnType<typeof snapshotQueryModule.useDashboardSnapshotQuery>);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    push.mockReset();
    mockToast.mockReset();
  });

  it("mostra os esqueletos enquanto carrega", () => {
    mockSnapshotQuery({ isLoading: true, isFetching: true });
    renderWithProviders(LAN_RUNTIME);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    // Os KPIs entram em skeleton — nenhum "0" na tela ainda.
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("mostra o estado vazio (tudo zerado, sem atenção, sem erros)", () => {
    mockSnapshotQuery({ data: EMPTY_DASHBOARD_SNAPSHOT });
    renderWithProviders(LAN_RUNTIME);

    expect(screen.getByText("Nenhuma NFC-e pendente de ação no momento.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum erro recente.")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("mostra a faixa de erro quando a consulta falha", () => {
    mockSnapshotQuery({ data: EMPTY_DASHBOARD_SNAPSHOT, error: new Error("Falha ao contactar o servidor.") });
    renderWithProviders(LAN_RUNTIME);

    expect(screen.getByText("Falha ao contactar o servidor.")).toBeInTheDocument();
  });

  it("mostra os dados completos no backend loja, incluindo as seções só de sync", () => {
    mockSnapshotQuery({ data: FULL_SNAPSHOT });
    renderWithProviders(LAN_RUNTIME);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Sincronizações (24h)")).toBeInTheDocument();
    expect(screen.getByText("Últimos Erros de Sincronização")).toBeInTheDocument();
    expect(screen.getByText("timeout na conexão")).toBeInTheDocument();
    expect(screen.getByText("Sync (FB → PG)")).toBeInTheDocument();
  });

  it("esconde as seções só de sync no backend nuvem", () => {
    mockSnapshotQuery({ data: FULL_SNAPSHOT });
    renderWithProviders(CLOUD_RUNTIME);

    expect(screen.queryByText("Sincronizações (24h)")).not.toBeInTheDocument();
    expect(screen.queryByText("Últimos Erros de Sincronização")).not.toBeInTheDocument();
    expect(screen.queryByText("Sync (FB → PG)")).not.toBeInTheDocument();
    expect(screen.queryByText("Erros Sync (24h)")).not.toBeInTheDocument();
    // O resto continua visível.
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("Atualizar dados mostra sucesso quando o refetch funciona (mesmo com alguma parte falhando em silêncio)", async () => {
    const refetch = vi.fn().mockResolvedValue({ isError: false });
    mockSnapshotQuery({ data: EMPTY_DASHBOARD_SNAPSHOT, refetch });
    renderWithProviders(LAN_RUNTIME);

    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados/ }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Dados atualizados" })),
    );
  });

  it("Atualizar dados mostra falha quando o refetch em si falha", async () => {
    const refetch = vi.fn().mockResolvedValue({ isError: true });
    mockSnapshotQuery({ data: EMPTY_DASHBOARD_SNAPSHOT, refetch });
    renderWithProviders(LAN_RUNTIME);

    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados/ }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Falha ao atualizar" })),
    );
  });
});
