import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const { OrdersPage } = await import("./OrdersPage");

function renderPage(backend: "lan" | "cloud" = "lan") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://admin.example" }}>
        <OrdersPage />
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

describe("OrdersPage", () => {
  it("mostra o estado de carregando antes das comandas chegarem", () => {
    vi.mocked(apiClient.apiRequest).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Carregando comandas...")).toBeInTheDocument();
  });

  it("mostra a lista vazia quando não há comandas no período", async () => {
    mockApi(() => ({ data: [] }));
    renderPage();
    expect(await screen.findByText("Nenhuma comanda encontrada.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comandas" })).toBeInTheDocument();
  });

  it("falha ao buscar comandas não quebra a tela (cai no estado vazio, como o legado)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error("falhou"));
    renderPage();
    await waitFor(() => expect(screen.queryByText("Carregando comandas...")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Comandas" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma comanda encontrada.")).toBeInTheDocument();
  });

  it("mostra a comanda com seus dados e o subtotal somado dos itens ativos", async () => {
    mockApi((path) => {
      if (path.startsWith("/orders")) {
        return {
          data: [
            {
              id: "o1",
              barcode: "000123",
              customer_name: "Maria",
              table_name: "5",
              totem_name: null,
              status: "open",
              fb_sale_id: null,
              fb_cash_register_id: null,
              sync_close_pending: false,
              sync_close_attempts: 0,
              sync_close_last_error: null,
              sync_close_requested_at: null,
              sync_closed_to_fb_at: null,
              tef_cancel_fb_sale_already_closed: false,
              tef_cancel_fb_sale_message: null,
              created_at: "2026-09-20T09:00:00Z",
              updated_at: "2026-09-20T09:00:00Z",
            },
          ],
        };
      }
      if (path.startsWith("/order-items")) {
        return {
          data: [
            {
              id: "i1",
              order_id: "o1",
              product_id: "p1",
              product_name: "Coxinha",
              product_barcode: "789",
              quantity: 2,
              unit_price: 5,
              subtotal: 10,
              unit_name: "UND",
              origin: "system",
              status: "active",
              synced_to_fb: true,
              fb_id: 1,
            },
            {
              id: "i2",
              order_id: "o1",
              product_id: "p2",
              product_name: "Refrigerante",
              product_barcode: "790",
              quantity: 1,
              unit_price: 8,
              subtotal: 8,
              unit_name: "UND",
              origin: "system",
              status: "cancelled",
              synced_to_fb: true,
              fb_id: 2,
            },
          ],
        };
      }
      return { data: [] };
    });

    renderPage();

    expect(await screen.findAllByText("000123")).not.toHaveLength(0);
    expect(screen.getAllByText("Maria").length).toBeGreaterThan(0);
    // Subtotal soma só o item ativo (R$ 10,00) — o cancelado (R$ 8,00) fica fora.
    expect(screen.getAllByText("R$ 10.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aberta").length).toBeGreaterThan(0);
  });

  describe("foto dos itens (homologação, 2026-10-01)", () => {
    const order = {
      id: "o1", barcode: "000123", customer_name: "Maria", table_name: "5", totem_name: null, status: "open",
      fb_sale_id: null, fb_cash_register_id: null, sync_close_pending: false, sync_close_attempts: 0,
      sync_close_last_error: null, sync_close_requested_at: null, sync_closed_to_fb_at: null,
      tef_cancel_fb_sale_already_closed: false, tef_cancel_fb_sale_message: null,
      created_at: "2026-09-20T09:00:00Z", updated_at: "2026-09-20T09:00:00Z",
    };
    const item = (id: string, productId: string, barcode: string) => ({
      id, order_id: "o1", product_id: productId, product_name: `Produto ${id}`, product_barcode: barcode, quantity: 1,
      unit_price: 5, subtotal: 5, unit_name: "UND", origin: "totem", status: "active", synced_to_fb: true, fb_id: 1,
    });
    const api = (path: string) => {
      if (path.startsWith("/orders")) return { data: [order] };
      if (path.startsWith("/order-items")) return { data: [item("i1", "p1", "789"), item("i2", "p2", "790")] };
      if (path.startsWith("/product-images")) return { data: { p1: "https://cdn/p1.jpg" } };
      return { data: [] };
    };
    const calledPaths = () => vi.mocked(apiClient.apiRequest).mock.calls.map(([path]) => path);

    it("nuvem: busca as fotos em /product-images (os itens da EasyFoodAPI não trazem image_url) e mostra a do produto", async () => {
      mockApi(api);
      const { container } = renderPage("cloud");
      await waitFor(() => expect(calledPaths()).toContain("/product-images?ids=p1%2Cp2"));
      fireEvent.click((await screen.findAllByText("000123"))[0]!);
      await waitFor(() => expect(container.querySelector('img[src="https://cdn/p1.jpg"]')).not.toBeNull());
      // Produto sem foto no mapa cai no placeholder, sem request.
      expect(container.querySelector('img[alt="790"]')).toBeNull();
    });

    it("loja: não chama /product-images (a foto vem do servidor de imagens, por barcode)", async () => {
      mockApi(api);
      renderPage("lan");
      expect(await screen.findAllByText("000123")).not.toHaveLength(0);
      expect(calledPaths().some((path) => path.startsWith("/product-images"))).toBe(false);
    });
  });

  it("Atualizar dados mostra falha quando o refetch falha (I1: refetch, não invalidateQueries)", async () => {
    mockApi(() => ({ data: [] }));
    renderPage();
    const button = await screen.findByRole("button", { name: "Atualizar dados" });

    vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error("falhou"));
    fireEvent.click(button);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Falha ao atualizar" })),
    );
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Dados atualizados" }));
  });

  it("Atualizar dados mostra sucesso quando o refetch funciona", async () => {
    mockApi(() => ({ data: [] }));
    renderPage();
    const button = await screen.findByRole("button", { name: "Atualizar dados" });

    fireEvent.click(button);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Dados atualizados" })),
    );
  });

  it("período fora do plano: Atualizar NÃO repete o aviso a cada clique (igual ao legado Orders.tsx — diferente de NFC-e/Transações)", async () => {
    mockApi((path) => {
      if (path.startsWith("/billing/plan-window")) {
        return { data: { planSlug: "basico", planName: "Básico", historyWindowDays: 7 } };
      }
      return { data: [] };
    });
    renderPage("cloud");

    // 1ª chamada: só a transição para bloqueado (efeito de `usePlanPeriodGuard`).
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Período fora do plano" })),
    );
    mockToast.mockReset();

    const button = await screen.findByRole("button", { name: "Atualizar dados" });
    await act(async () => {
      fireEvent.click(button);
    });
    await act(async () => {
      fireEvent.click(button);
    });

    // Nenhum toast novo: nem "Período fora do plano" de novo, nem sucesso/falha (o refresh nem chama a API).
    expect(mockToast).not.toHaveBeenCalled();
  });
});
