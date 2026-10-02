import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const push = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

const { NfceListPage } = await import("./NfceListPage");

function renderPage(backend: "lan" | "cloud" = "lan") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://admin.example" }}>
        <NfceListPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

function mockApi(byPath: (path: string) => unknown) {
  vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => byPath(path));
}

const NOTE_ROW = {
  id: "note-1",
  numero: 42,
  serie: 1,
  chave_acesso: "3526...",
  status: "authorized",
  valor_total: "125.5",
  valor_desconto: "0",
  emissao_em: "2026-01-10T12:00:00Z",
  autorizada_em: "2026-01-10T12:00:05Z",
  protocolo: "123456789012345",
  codigo_retorno: "100",
  motivo_retorno: "Autorizado o uso da NF-e",
  tipo_emissao: 1,
  reconcile_status: null,
  retry_count: 0,
  order_id: null,
  qrcode: null,
  emitente_cnpj: "12345678000199",
  emitente_razao: "Restaurante Sabor & Cia",
  emitente_fantasia: "Sabor & Cia",
  emitente_uf: "SP",
  destinatario_cpf: "11122233344",
  destinatario_nome: "Maria da Silva",
  qtd_itens: 3,
  formas_pagamento: "17",
};

const EMPTY_RESPONSES = (path: string) => {
  if (path.startsWith("/nfce/notes")) return { data: [], total: 0, page: 1, limit: 50 };
  if (path.startsWith("/nfce/totals")) return { data: { total: 0, porStatus: {}, valorAutorizado: "0" } };
  if (path.startsWith("/nfce/attention-counts")) return { data: { manualReview: 0, reconcileFailed: 0, unusable: 0 } };
  return { data: [] };
};

beforeEach(() => {
  vi.mocked(apiClient.apiRequest).mockReset();
  mockToast.mockReset();
  push.mockReset();
  searchParams = new URLSearchParams();
});

describe("NfceListPage", () => {
  it("mostra os esqueletos de carregamento antes das notas chegarem", () => {
    vi.mocked(apiClient.apiRequest).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { name: "Consulta NFC-e" })).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma NFC-e encontrada")).not.toBeInTheDocument();
  });

  it("mostra a lista vazia quando não há notas no filtro", async () => {
    mockApi(EMPTY_RESPONSES);
    renderPage();
    expect(await screen.findByText("Nenhuma NFC-e encontrada")).toBeInTheDocument();
  });

  it("falha ao buscar notas avisa por toast e cai no estado vazio (como o legado)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new Error("falhou"));
    renderPage();
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Erro", description: "falhou" })),
    );
    expect(await screen.findByText("Nenhuma NFC-e encontrada")).toBeInTheDocument();
  });

  it("mostra a nota com seus dados", async () => {
    mockApi((path) => {
      if (path.startsWith("/nfce/notes")) return { data: [NOTE_ROW], total: 1, page: 1, limit: 50 };
      if (path.startsWith("/nfce/totals")) return { data: { total: 1, porStatus: { authorized: 1 }, valorAutorizado: "125.5" } };
      if (path.startsWith("/nfce/attention-counts")) return { data: { manualReview: 0, reconcileFailed: 0, unusable: 0 } };
      return { data: [] };
    });

    renderPage();

    expect(await screen.findAllByText("000000042", { exact: false })).not.toHaveLength(0);
    expect(screen.getAllByText("Maria da Silva").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 nota encontrada", { exact: false }).length).toBeGreaterThan(0);
  });

  // Validação de escrita (2026-10-01): status fora do mapa (ex.: "contingency", "pending") aparece
  // CRU no legado (`statusLabel(s)` devolve o próprio texto, cor cinza); o Next mostrava "Rascunho"
  // porque `toNfceStatus` dobra o desconhecido em `draft`.
  it("status desconhecido aparece com o texto cru da API, não como Rascunho (igual ao legado)", async () => {
    mockApi((path) => {
      if (path.startsWith("/nfce/notes")) return { data: [{ ...NOTE_ROW, status: "contingency" }], total: 1, page: 1, limit: 50 };
      if (path.startsWith("/nfce/totals")) return { data: { total: 1, porStatus: {}, valorAutorizado: "0" } };
      if (path.startsWith("/nfce/attention-counts")) return { data: { manualReview: 0, reconcileFailed: 0, unusable: 0 } };
      return { data: [] };
    });

    renderPage();

    expect((await screen.findAllByLabelText("Status: contingency")).length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText("Status: Rascunho")).toHaveLength(0);
  });

  it("Atualizar dados mostra sucesso quando o refetch funciona", async () => {
    mockApi(EMPTY_RESPONSES);
    renderPage();
    const button = await screen.findByRole("button", { name: "Atualizar dados" });

    fireEvent.click(button);

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Dados atualizados" })));
  });

  it("invariante 3: lê ?status=manual_review da URL e já pede a lista filtrada (link do Dashboard)", async () => {
    searchParams = new URLSearchParams("status=manual_review");
    mockApi(EMPTY_RESPONSES);
    renderPage();

    await waitFor(() => expect(apiClient.apiRequest).toHaveBeenCalled());
    const notesCall = vi.mocked(apiClient.apiRequest).mock.calls.find(([path]) => (path as string).startsWith("/nfce/notes"));
    expect(notesCall?.[0]).toContain("status=manual_review");
  });

  it("invariante 3: lê ?status=all&reconcileStatus=failed da URL (link 'Reconciliação falhou')", async () => {
    searchParams = new URLSearchParams("status=all&reconcileStatus=failed");
    mockApi(EMPTY_RESPONSES);
    renderPage();

    await waitFor(() => expect(apiClient.apiRequest).toHaveBeenCalled());
    const notesCall = vi.mocked(apiClient.apiRequest).mock.calls.find(([path]) => (path as string).startsWith("/nfce/notes"));
    expect(notesCall?.[0]).toContain("reconcileStatus=failed");
    expect(notesCall?.[0]).not.toContain("status=all");
  });

  it("Importante 2 — reprocessar pela lista atualiza também totais e attention-counts (não só a lista)", async () => {
    const reprocessableNote = { ...NOTE_ROW, status: "manual_review", tipo_emissao: 9 };
    let attentionCalls = 0;
    let totalsCalls = 0;
    mockApi((path) => {
      if (path.startsWith("/nfce/notes/") && path.endsWith("/reprocess")) {
        return { ok: true, message: "Reprocessamento solicitado." };
      }
      if (path.startsWith("/nfce/notes")) return { data: [reprocessableNote], total: 1, page: 1, limit: 50 };
      if (path.startsWith("/nfce/totals")) {
        totalsCalls += 1;
        return { data: { total: 1, porStatus: { manual_review: 1 }, valorAutorizado: "0" } };
      }
      if (path.startsWith("/nfce/attention-counts")) {
        attentionCalls += 1;
        return { data: { manualReview: 1, reconcileFailed: 0, unusable: 0 } };
      }
      return { data: [] };
    });

    renderPage();

    // Desktop e mobile renderizam juntos em jsdom (a ocultação é só CSS por breakpoint); os dois
    // botões disparam o mesmo `onReprocess`, então qualquer um serve para o teste.
    const [reprocessButton] = await screen.findAllByRole("button", { name: "Reprocessar" });
    await waitFor(() => expect(totalsCalls).toBe(1));
    await waitFor(() => expect(attentionCalls).toBe(1));

    fireEvent.click(reprocessButton!);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Reprocessamento solicitado" })),
    );
    // A 1ª chamada de cada é a carga inicial; reprocessar deve gerar uma 2ª (refetch), não só na lista.
    await waitFor(() => expect(totalsCalls).toBe(2));
    await waitFor(() => expect(attentionCalls).toBe(2));
  });

  it("período fora do plano: Atualizar avisa a CADA tentativa (igual ao legado NfcePage, diferente de Comandas)", async () => {
    mockApi((path) => {
      if (path.startsWith("/billing/plan-window")) {
        return { data: { planSlug: "basico", planName: "Básico", historyWindowDays: 7 } };
      }
      return EMPTY_RESPONSES(path);
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
