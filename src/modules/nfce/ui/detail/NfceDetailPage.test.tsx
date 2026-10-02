import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as apiClient from "@/shared/http/api-client";
import { ApiError } from "@/shared/http/api-error";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";

vi.mock("@/shared/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/shared/http/api-client")>("@/shared/http/api-client");
  return { ...actual, apiRequest: vi.fn() };
});

const tenant = { selection: { companyId: "company-1", storeId: "store-1" } };
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "n1" }),
  useRouter: () => ({ push }),
}));

const { NfceDetailPage } = await import("./NfceDetailPage");

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={{ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" }}>
        <NfceDetailPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

const DETAIL_ROW = {
  id: "n1",
  numero: 100,
  serie: 1,
  modelo: "65",
  chave_acesso: "3526040000000000000000000000000000000000000000",
  status: "authorized",
  tipo_emissao: 1,
  finalidade: 1,
  emissao_em: "2026-04-06T12:17:27.000Z",
  autorizada_em: "2026-04-06T12:17:30.000Z",
  protocolo: "123456789012345",
  codigo_retorno: "100",
  motivo_retorno: "Autorizado o uso da NF-e",
  qrcode: null,
  url_consulta: null,
  order_id: null,
  transaction_id: null,
  total_nota: "228.99",
  total_produtos: "228.99",
  total_desconto: "0",
  total_frete: "0",
  total_seguro: "0",
  outras_despesas: "0",
  total_icms: "0",
  total_icms_st: "0",
  total_ipi: "0",
  total_pis: "0",
  total_cofins: "0",
  total_fcp: "0",
  reconcile_status: null,
  retry_count: 0,
  natureza_operacao: "Venda",
  ambiente: 1,
  consumidor_final: 1,
  indicador_presenca: 1,
  emitente_cnpj: "13971933000178",
  emitente_razao: "EASY SOFT",
  emitente_uf: "SP",
  emitente_crt: 3,
  destinatario_cpf: null,
  destinatario_nome: null,
  qtd_itens: 1,
  formas_pagamento: "17",
};

function mockApi(byPath: (path: string) => unknown) {
  vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => byPath(path));
}

beforeEach(() => {
  vi.mocked(apiClient.apiRequest).mockReset();
  mockToast.mockReset();
  push.mockReset();
});

describe("NfceDetailPage", () => {
  it("mostra o estado de carregando antes da nota chegar", () => {
    vi.mocked(apiClient.apiRequest).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("mostra 'Nota não encontrada' quando a API responde 404 no detalhe", async () => {
    mockApi((path) => {
      if (path === "/nfce/notes/n1") throw new ApiError(404, "not_found", "not found");
      return { data: [] };
    });
    renderPage();
    expect(await screen.findByText("Nota não encontrada")).toBeInTheDocument();
  });

  it("carrega a nota e mostra o cabeçalho com número, série e status", async () => {
    mockApi((path) => {
      if (path === "/nfce/notes/n1") return { data: DETAIL_ROW };
      if (path === "/nfce/notes/n1/items") return { data: [{ item: 1, descricao: "Coxinha", ncm: "19059090", cfop: "5102" }] };
      if (path === "/nfce/notes/n1/payments") return { data: [{ seq: 1, forma_pagamento: "17", forma_descricao: "PIX", valor: "228.99" }] };
      return { data: [] };
    });
    renderPage();

    expect(await screen.findByText("000000100")).toBeInTheDocument();
    expect(screen.getByText("Série 001")).toBeInTheDocument();
    expect(screen.getAllByText("Autorizada").length).toBeGreaterThan(0);
  });

  it("a aba Correção mostra a mensagem de edição indisponível fora de manual_review", async () => {
    mockApi((path) => {
      if (path === "/nfce/notes/n1") return { data: DETAIL_ROW };
      return { data: [] };
    });
    renderPage();
    await screen.findByText("000000100");

    await userEvent.click(screen.getByRole("tab", { name: /Correção/ }));

    expect(
      await screen.findByText(/A edição manual só fica disponível para notas com status/),
    ).toBeInTheDocument();
  });
});
