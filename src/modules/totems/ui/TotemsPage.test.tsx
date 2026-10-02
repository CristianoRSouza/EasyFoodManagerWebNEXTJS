import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { Toaster } from "@/shared/ui/primitives/toaster";

// O aviso de voucher vai pelo Sonner: o Toaster do shadcn (igual ao legado) mostra um toast por vez
// e o aviso apagaria o "Totem atualizado com sucesso".
const sonnerToast = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock("@/shared/ui/primitives/sonner", () => ({ toast: sonnerToast }));

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { TotemsPage } = await import("./TotemsPage");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };
const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.nuvem.dev", adminPlatformUrl: "https://b" };

function renderPage(runtime: RuntimeInfo = lan) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <TotemsPage />
        <Toaster />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(routes: Record<string, { status: number; body: unknown }>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const path = url.split("?")[0] ?? url;
    const match = routes[path];
    if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    return new Response(JSON.stringify(match.body), { status: match.status });
  });
}

const TOTEM_ATIVO = {
  id: "t1",
  totem_name: "TOTEM-LOJA01-CAIXA01",
  is_active: true,
  app_mode: "producao",
  payment_environment: "producao",
  nfce_environment: 1,
  nfce_serie: 1,
  nfce_service_url: "http://192.168.0.10:3002",
  nfce_service_api_key: null,
  nfce_emit_timeout_ms: 120000,
  tef_http_base_url: null,
  tef_http_api_key: null,
  tef_base_url: "https://localhost:4090",
  tef_insecure_tls: false,
  aditum_partner_token_encrypted: "enc:v1:CIPHERTEXT-PARTNER",
  aditum_partner_token_kid: "kid-1",
  aditum_activation_code_encrypted: "enc:v1:CIPHERTEXT-ATIVATION",
  aditum_activation_code_kid: "kid-1",
  establishment_cnpj: "13971933000178",
  tef_application_name: "EasySoft PDV",
  tef_application_version: "1.0.0",
  tef_contactless: false,
  tef_poll_interval_ms: 600,
  tef_poll_max_ms: 180000,
  tef_credit_installment_type: "Merchant",
  tef_confirm_after_charge: true,
  tef_claim_source_statuses: "pending,tef_requested",
  tef_enable_worker_pending_job: false,
  payment_credit_enabled: true,
  payment_debit_enabled: true,
  payment_pix_enabled: true,
  pix_http_base_url: null,
  pix_http_api_key: null,
  image_server_host: "127.0.0.1",
  image_server_port: 3001,
  printer_enabled: false,
  printer_model: "0",
  printer_port: "",
  printer_code_page: 2,
  printer_cols_normal: 64,
  printer_cut_paper: true,
  printer_cut_type: 0,
  printer_translate_tags: true,
  printer_ignore_tags: false,
  printer_verify: false,
  printer_line_feed_after: 3,
  printer_copies: 1,
  printer_timeout_ms: 3500,
  last_heartbeat_at: null,
  heartbeat_machine_id: null,
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-01T10:00:00Z",
  license_id: "lic-1",
  license_device_key: "TOTEM-LOJA01-CAIXA01",
  license_status: "active",
  license_type: "monthly",
  plan_slug: "ecp-standard",
  license_starts_at: "2026-01-01T00:00:00Z",
  license_expires_at: "2027-01-01T00:00:00Z",
  max_transactions_month: 5000,
};

const BASE_ROUTES = {
  "/api/v1/totems": { status: 200, body: { data: [TOTEM_ATIVO] } },
  "/api/v1/totem-available-licenses": { status: 200, body: { data: [] } },
  "/api/v1/totem-licenses": { status: 200, body: { data: [] } },
  "/api/v1/totems/series-status": { status: 200, body: { data: [] } },
};

afterEach(() => vi.restoreAllMocks());

describe("TotemsPage", () => {
  it("mostra o estado de carregamento antes da resposta chegar", async () => {
    let resolveFetch: (r: Response) => void = () => undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    renderPage();
    expect(screen.getByLabelText("Carregando totens")).toBeInTheDocument();

    resolveFetch(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await waitFor(() => expect(screen.queryByLabelText("Carregando totens")).toBeNull());
  });

  it("estado vazio: nenhum totem cadastrado", async () => {
    mockFetch({ ...BASE_ROUTES, "/api/v1/totems": { status: 200, body: { data: [] } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nenhum totem cadastrado")).toBeInTheDocument());
  });

  it("estado de erro: a API falha — cai no mesmo card do estado vazio", async () => {
    mockFetch({ ...BASE_ROUTES, "/api/v1/totems": { status: 500, body: { message: "database_error" } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nenhum totem cadastrado")).toBeInTheDocument());
  });

  it("estado com dados: mostra o totem, badges e o resumo", async () => {
    mockFetch(BASE_ROUTES);
    renderPage();

    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
  });

  it("INVARIANTE — segredos Aditum nunca aparecem em claro na lista", async () => {
    mockFetch(BASE_ROUTES);
    renderPage();
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    expect(screen.queryByText(/CIPHERTEXT/)).toBeNull();
    expect(screen.queryByText(/enc:v1:/)).toBeNull();
  });

  it("INVARIANTE — ao editar, os campos de segredo Aditum abrem SEMPRE em branco, mesmo com cifra gravada", async () => {
    mockFetch(BASE_ROUTES);
    renderPage();
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("tab", { name: /Aditum/ }));

    const partnerInput = await within(dialog).findByLabelText(/Partner Token/);
    const activationInput = within(dialog).getByLabelText(/Ativation Code/);
    expect(partnerInput).toHaveValue("");
    expect(activationInput).toHaveValue("");
    expect(within(dialog).getAllByText("(definido)").length).toBe(2);
    expect(within(dialog).queryByText(/CIPHERTEXT/)).toBeNull();
  });

  it("backend cloud: grava igual ao legado (isCloudApiMode()) — mostra Novo Totem e Editar", async () => {
    mockFetch(BASE_ROUTES);
    renderPage(cloud);
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Novo Totem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });
});

describe("TotemsPage — reenfileirar no LAN (I1, paridade com TotemConfigPage.tsx#handleRequeueSync)", () => {
  const REQUEUE = "/api/v1/totems/t1/requeue-cloud-sync";

  it("Sync PG-SB parado: título 'inicie o Sync PG-SB' com o hint do diagnóstico", async () => {
    mockFetch({
      ...BASE_ROUTES,
      [REQUEUE]: {
        status: 200,
        body: {
          outbox_inserted: true,
          licenses_requeued: 1,
          sync_hint: "",
          sync_diagnostics: { recommendation: "start_sync_service", sync_service_likely_running: false, hint_pt: "Inicie o serviço." },
        },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: "Forçar sincronização PG → nuvem" }));
    expect(await screen.findByText("TOTEM-LOJA01-CAIXA01: inicie o Sync PG-SB")).toBeInTheDocument();
    expect(screen.getByText("Inicie o serviço.")).toBeInTheDocument();
  });

  it("Sync PG-SB rodando: título neutro 'na outbox (PG → nuvem)'", async () => {
    mockFetch({
      ...BASE_ROUTES,
      [REQUEUE]: {
        status: 200,
        body: {
          outbox_inserted: false,
          licenses_requeued: 1,
          sync_hint: "Na fila.",
          sync_diagnostics: { recommendation: "ok", sync_service_likely_running: true, hint_pt: null },
        },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: "Forçar sincronização PG → nuvem" }));
    expect(await screen.findByText("TOTEM-LOJA01-CAIXA01 na outbox (PG → nuvem)")).toBeInTheDocument();
    expect(screen.getByText("Já havia evento recente na fila. Na fila.")).toBeInTheDocument();
  });
});

describe("TotemsPage — falha ao salvar (Menor 7)", () => {
  it("mostra 'Erro ao salvar', mantém o diálogo aberto e não deixa rejeição sem tratamento", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const path = String(input).split("?")[0] ?? "";
      if ((init?.method ?? "GET") === "PATCH") {
        return new Response(JSON.stringify({ code: "database_error", message: "Falha ao gravar no banco." }), { status: 500 });
      }
      const match = (BASE_ROUTES as Record<string, { status: number; body: unknown }>)[path];
      if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
      return new Response(JSON.stringify(match.body), { status: match.status });
    });
    renderPage(cloud);
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Erro ao salvar")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("TotemsPage — voucher sem suporte na API da loja (desvio deliberado do legado)", () => {
  function mockSave(row: Record<string, unknown>) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const path = String(input).split("?")[0] ?? "";
      if ((init?.method ?? "GET") === "PATCH") return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (path === "/api/v1/totems") return new Response(JSON.stringify({ data: [row] }), { status: 200 });
      const match = (BASE_ROUTES as Record<string, { status: number; body: unknown }>)[path];
      if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
      return new Response(JSON.stringify(match.body), { status: match.status });
    });
  }

  beforeEach(() => sonnerToast.warning.mockReset());

  async function editAndSave(toggleVoucher: boolean) {
    renderPage(lan);
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    if (toggleVoucher) await userEvent.click(within(dialog).getByRole("switch", { name: "Voucher" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Totem atualizado com sucesso")).toBeInTheDocument();
  }

  it("LAN sem colunas de voucher e voucher alterado: sucesso E aviso 'Configuração de voucher não gravada'", async () => {
    mockSave(TOTEM_ATIVO);
    await editAndSave(true);
    // o sucesso continua visível (Toaster) e o aviso vem à parte (Sonner)
    expect(screen.getByText("Totem atualizado com sucesso")).toBeInTheDocument();
    expect(sonnerToast.warning).toHaveBeenCalledTimes(1);
    expect(sonnerToast.warning).toHaveBeenCalledWith("Configuração de voucher não gravada", {
      description: "A API desta loja ainda não suporta voucher.",
    });
  });

  it("LAN sem colunas de voucher e voucher intocado: só o sucesso", async () => {
    mockSave(TOTEM_ATIVO);
    await editAndSave(false);
    expect(sonnerToast.warning).not.toHaveBeenCalled();
  });

  it("API com colunas de voucher e voucher alterado: só o sucesso", async () => {
    mockSave({ ...TOTEM_ATIVO, payment_voucher_enabled: false, payment_voucher_kind: "meal" });
    await editAndSave(true);
    expect(sonnerToast.warning).not.toHaveBeenCalled();
  });
});

describe("TotemsPage — série NFC-e de outro totem (legado 1.3.13, PR #56)", () => {
  const SERIES_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const ownerRow = (active: boolean | null) => ({
    series_id: SERIES_ID,
    serie: 1,
    environment: 1,
    current_number: 41,
    owner_totem_id: active === null ? null : "t-old",
    owner_totem_name: active === null ? null : "TOTEM-01",
    owner_active: active,
  });

  type Call = { method: string; url: string; body: Record<string, unknown> | null };

  function mockWithOwner(owner: unknown, ownerStatus = 200): Call[] {
    const calls: Call[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const path = url.split("?")[0] ?? "";
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (method === "PATCH" || method === "POST") return new Response(JSON.stringify({ ok: true, id: "t1" }), { status: 200 });
      if (path === "/api/v1/totems/series-owner") {
        return new Response(JSON.stringify(ownerStatus === 200 ? { data: owner } : { error: "not_found" }), { status: ownerStatus });
      }
      const match = (BASE_ROUTES as Record<string, { status: number; body: unknown }>)[path];
      if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
      return new Response(JSON.stringify(match.body), { status: match.status });
    });
    return calls;
  }

  async function openEditAndSave(runtime: RuntimeInfo = lan) {
    renderPage(runtime);
    await waitFor(() => expect(screen.getAllByText("TOTEM-LOJA01-CAIXA01").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    return dialog;
  }

  const patches = (calls: Call[]) => calls.filter((c) => c.method === "PATCH");

  it("dono inativo: pergunta, com a série, o ambiente e o próximo número", async () => {
    const calls = mockWithOwner(ownerRow(false));
    await openEditAndSave();

    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("Transferir a série NFC-e?")).toBeInTheDocument();
    expect(within(confirm).getByText("A série 1 de produção está vinculada ao totem TOTEM-01 (inativo).")).toBeInTheDocument();
    expect(within(confirm).getByText("nº 42")).toBeInTheDocument();
    expect(within(confirm).getByText(/Só este ambiente é transferido\. O totem TOTEM-01 fica sem essa série\./)).toBeInTheDocument();
    expect(calls.find((c) => c.url.startsWith("/api/v1/totems/series-owner"))?.url).toBe(
      "/api/v1/totems/series-owner?serie=1&environment=1&totemId=t1",
    );
    expect(patches(calls)).toHaveLength(0);
  });

  it("confirmar: salva com transfer_series_id e fecha os dois diálogos", async () => {
    const calls = mockWithOwner(ownerRow(false));
    await openEditAndSave();
    const confirm = await screen.findByRole("alertdialog");
    await userEvent.click(within(confirm).getByRole("button", { name: "Transferir e salvar" }));

    expect(await screen.findByText("Totem atualizado com sucesso")).toBeInTheDocument();
    const saved = patches(calls);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.url).toBe("/api/v1/totems/t1");
    expect(saved[0]?.body?.transfer_series_id).toBe(SERIES_ID);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("cancelar: não salva e o formulário continua aberto", async () => {
    const calls = mockWithOwner(ownerRow(false));
    await openEditAndSave();
    const confirm = await screen.findByRole("alertdialog");
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(patches(calls)).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("linha antiga sem totem: pergunta sem citar totem que fica sem a série", async () => {
    mockWithOwner(ownerRow(null));
    await openEditAndSave();
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("A série 1 de produção está vinculada a uma configuração antiga sem totem.")).toBeInTheDocument();
    expect(within(confirm).queryByText(/fica sem essa série/)).toBeNull();
  });

  it("dono ativo: bloqueia com toast, vai para a aba NFC-e e não salva", async () => {
    const calls = mockWithOwner(ownerRow(true));
    const dialog = await openEditAndSave();

    expect(await screen.findByText("Série NFC-e em uso por outro totem ativo")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A série 1 de produção está vinculada ao totem TOTEM-01 (ativo). Dois totens ativos não podem usar a mesma série: escolha outra série ou desative o outro totem.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: /NFC-e/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(patches(calls)).toHaveLength(0);
  });

  it("série livre: salva direto, sem transfer_series_id", async () => {
    const calls = mockWithOwner(null);
    await openEditAndSave();
    expect(await screen.findByText("Totem atualizado com sucesso")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(patches(calls)[0]?.body).not.toHaveProperty("transfer_series_id");
  });

  it("consulta falhou (API sem a rota): salva direto, como o `.catch(() => null)` do legado", async () => {
    const calls = mockWithOwner(null, 404);
    await openEditAndSave();
    expect(await screen.findByText("Totem atualizado com sucesso")).toBeInTheDocument();
    expect(patches(calls)).toHaveLength(1);
  });

  it("nuvem: não consulta o dono da série (é só local)", async () => {
    const calls = mockWithOwner(ownerRow(false));
    await openEditAndSave(cloud);
    expect(await screen.findByText("Totem atualizado com sucesso")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("series-owner"))).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
