import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/shared/http/api-client")>("@/shared/http/api-client");
  return { ...actual, apiRequest: vi.fn() };
});

const tenant = { selection: { companyId: "company-1", storeId: "store-1" } };
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

const { TransactionsPage } = await import("./TransactionsPage");

function renderPage(backend: "lan" | "cloud" = "lan") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://admin.example" }}>
        <TransactionsPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

function mockApi(byPath: (path: string) => unknown) {
  vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => byPath(path));
}

beforeEach(() => {
  vi.mocked(apiClient.apiRequest).mockReset();
  mockToast.mockReset();
});

describe("TransactionsPage", () => {
  it("mostra o estado de carregando antes das transações chegarem", () => {
    vi.mocked(apiClient.apiRequest).mockImplementation(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Carregando transações...")).toBeInTheDocument();
  });

  it("vazio: sem transações no período, mostra o aviso e totais zerados", async () => {
    mockApi(() => ({ data: [] }));

    renderPage();

    expect(await screen.findByText("Nenhuma transação encontrada.")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 0.00")).toHaveLength(3);
  });

  it("falha ao buscar transações não quebra a tela (cai no estado vazio, como o legado)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error("falhou"));

    renderPage();

    await waitFor(() => expect(screen.queryByText("Carregando transações...")).not.toBeInTheDocument());
    expect(screen.getByText("Nenhuma transação encontrada.")).toBeInTheDocument();
  });

  it("com dados: mostra a transação na tabela e no card de totais, com valor, método e status", async () => {
    mockApi((path) => {
      if (path.startsWith("/transactions")) {
        return {
          data: [
            {
              id: "11111111-aaaa-bbbb-cccc-111111111111",
              order_ids: ["o1"],
              payment_method: "pix",
              amount: "42.50",
              installments: 1,
              nsu: "000999",
              authorization_code: "AUTH1",
              tef_transaction_id: null,
              status: "approved",
              created_at: "2026-01-10T12:00:00.000Z",
              pix_status: "paid",
              pix_qrcode_id: "qr-1",
            },
          ],
        };
      }
      if (path.startsWith("/orders")) {
        return { data: [{ id: "o1", barcode: "789" }] };
      }
      return { data: [] };
    });

    const { container } = renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("789")).toBeInTheDocument();
    expect(within(table).getByText("R$ 42.50")).toBeInTheDocument();
    expect(within(table).getByText("Aprovada")).toBeInTheDocument();
    expect(within(table).getByText("PIX")).toBeInTheDocument();

    const summary = container.querySelector(".grid.grid-cols-3");
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("R$ 42.50")).toBeInTheDocument();
  });

  it("Atualizar dados recarrega só a lista de transações (o período inteiro, numa chamada), como o legado", async () => {
    mockApi(() => ({ data: [] }));
    renderPage();
    const button = await screen.findByRole("button", { name: "Atualizar dados" });
    vi.mocked(apiClient.apiRequest).mockClear();

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar dados" })).toBeEnabled());
    const paths = vi.mocked(apiClient.apiRequest).mock.calls.map(([path]) => path);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^\/transactions\?/);
  });

  it("período fora do plano: Atualizar avisa a CADA tentativa (igual ao legado Transactions.tsx, diferente de Comandas)", async () => {
    mockApi((path) => {
      if (path.startsWith("/billing/plan-window")) {
        return { data: { planSlug: "basico", planName: "Básico", historyWindowDays: 7 } };
      }
      return { data: [] };
    });
    renderPage("cloud");

    // 1ª chamada: a transição para bloqueado (efeito de `usePlanPeriodGuard`).
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Período fora do plano" })),
    );
    mockToast.mockReset();

    const button = await screen.findByRole("button", { name: "Atualizar dados" });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Período fora do plano" })),
    );

    mockToast.mockReset();
    fireEvent.click(button);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Período fora do plano" })),
    );
  });
});
