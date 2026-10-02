import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { Toaster } from "@/shared/ui/primitives/toaster";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { IssuerPage } = await import("./IssuerPage");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };
const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.nuvem.dev", adminPlatformUrl: "https://b" };

function renderPage(runtime: RuntimeInfo = lan) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <IssuerPage />
        <Toaster />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

const ISSUER_ROW = {
  id: "issuer-1",
  cnpj: "12345678000199",
  company_name: "Restaurante Exemplo Ltda",
  trade_name: "Exemplo Lanches",
  state_registration: "123456789",
  state_registration_st: null,
  municipal_registration: "987654",
  cnae: "5611203",
  tax_regime_code: 3,
  phone: "11987654321",
  legacy_loja_id: 7,
  pis_cofins_regime_code: 1,
  street: "Rua das Flores",
  number: "100",
  complement: null,
  neighborhood: "Centro",
  municipality_code: "3550308",
  municipality_name: "São Paulo",
  uf: "SP",
  zip_code: "01001000",
  country_code: "1058",
  country_name: "Brasil",
  environment: 2,
  nfce_serie: 1,
  nfe_serie: null,
  nfce_security_code: "CSC123",
  nfce_security_code_id: "000001",
  is_active: true,
  notes: "Observação de teste",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-10T10:00:00Z",
  inf_ad_fb_config_250: null,
  inf_ad_fb_config_251: null,
  aditum_tef_partner_token_encrypted_set: true,
  aditum_tef_activation_code_encrypted_set: false,
  issuer_sensitive_secrets_ready: true,
  tef_admin_http_base_url: null,
  tef_admin_http_api_key: null,
  companyid_easyerp: null,
  storeid_easyerp: null,
  easyerp_api_key_set: true,
  certificate_holder_name: null,
  certificate_holder_cnpj: null,
  certificate_authority_name: null,
  certificate_series: null,
  certificate_type: null,
  certificate_pfx_relative_path: null,
  certificate_source_path: null,
  certificate_exported_at: null,
  certificate_valid_until: null,
  crypto_library_flag: null,
  certificate_access_flag: null,
};

interface PatchCall {
  url: string;
  body: Record<string, unknown>;
}

/** PATCH sempre bem-sucedido, a menos que `patchStatus`/`patchBody` diga o contrário. */
function mockFetchWithPatchSpy(patchCalls: PatchCall[], patchResponse: { status: number; body: unknown } = { status: 200, body: { ok: true } }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "GET" && url === "/api/v1/nfce/issuer-config") {
      return new Response(JSON.stringify({ data: [ISSUER_ROW] }), { status: 200 });
    }
    if (method === "GET" && url === "/api/v1/nfce/acbr-config") {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (method === "PATCH" && url.startsWith("/api/v1/nfce/issuer-config/")) {
      patchCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify(patchResponse.body), { status: patchResponse.status });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("IssuerPage — edição (backend lan)", () => {
  it("mostra 'Editar' e, ao clicar, abre os campos preenchidos com o cadastro atual", async () => {
    mockFetchWithPatchSpy([]);
    renderPage();

    const editButton = await screen.findByRole("button", { name: "Editar" });
    await userEvent.click(editButton);

    expect(screen.getByDisplayValue("Restaurante Exemplo Ltda")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Exemplo Lanches")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Salvar/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Cancelar" }).length).toBeGreaterThan(0);
  });

  it("não mostra 'Editar' no backend cloud (gravação não confirmada na EasyFoodAPI)", async () => {
    mockFetchWithPatchSpy([]);
    renderPage(cloud);
    await waitFor(() => expect(screen.getAllByText("Exemplo Lanches").length).toBeGreaterThan(0));
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("Cancelar restaura os valores originais e não chama a API", async () => {
    const patchCalls: PatchCall[] = [];
    mockFetchWithPatchSpy(patchCalls);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const tradeNameInput = screen.getByDisplayValue("Exemplo Lanches");
    await userEvent.clear(tradeNameInput);
    await userEvent.type(tradeNameInput, "Nome Rascunho Descartado");

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar" })[0]!);

    expect(screen.queryByDisplayValue("Nome Rascunho Descartado")).toBeNull();
    expect(screen.getAllByText("Exemplo Lanches").length).toBeGreaterThan(0);
    expect(patchCalls).toHaveLength(0);
  });

  it("Salvar: envia PATCH com todos os campos do rascunho (igual ao legado), mostra toast de sucesso e sai da edição", async () => {
    const patchCalls: PatchCall[] = [];
    mockFetchWithPatchSpy(patchCalls);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const tradeNameInput = screen.getByDisplayValue("Exemplo Lanches");
    await userEvent.clear(tradeNameInput);
    await userEvent.type(tradeNameInput, "Novo Nome Fantasia");

    await userEvent.click(screen.getAllByRole("button", { name: /Salvar/ })[0]!);

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect(patchCalls[0]!.url).toBe("/api/v1/nfce/issuer-config/issuer-1");
    expect(patchCalls[0]!.body.trade_name).toBe("Novo Nome Fantasia");

    expect(await screen.findByText("Salvo com sucesso")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument());
  });

  it("erro ao salvar: mostra toast de falha e MANTÉM o modo de edição (não perde o rascunho)", async () => {
    const patchCalls: PatchCall[] = [];
    mockFetchWithPatchSpy(patchCalls, { status: 500, body: { code: "database_error", message: "Falha ao gravar no banco." } });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getAllByRole("button", { name: /Salvar/ })[0]!);

    expect(await screen.findByText("Erro ao salvar")).toBeInTheDocument();
    expect(await screen.findByText("Falha ao gravar no banco.")).toBeInTheDocument();
    // Continua em edição: o botão "Cancelar" (só existe durante a edição) ainda está lá.
    expect(screen.getAllByRole("button", { name: "Cancelar" }).length).toBeGreaterThan(0);
  });
});

describe("IssuerPage — edição de segredos (invariante 2)", () => {
  it("segredo NÃO digitado (deixado em branco) não entra no corpo do PATCH", async () => {
    const patchCalls: PatchCall[] = [];
    mockFetchWithPatchSpy(patchCalls);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    // Não mexe em nenhum campo de segredo — só salva do jeito que abriu.
    await userEvent.click(screen.getAllByRole("button", { name: /Salvar/ })[0]!);

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    const body = patchCalls[0]!.body;
    expect("aditum_tef_partner_token" in body).toBe(false);
    expect("aditum_tef_activation_code" in body).toBe(false);
    expect("apikey_easyerp" in body).toBe(false);
    expect("certificate_password" in body).toBe(false);
    expect("tef_admin_http_api_key" in body).toBe(false);
  });

  it("Importante 1 — tef_admin_http_api_key vindo em claro da API abre vazio no input e não é reenviado sem edição", async () => {
    const patchCalls: PatchCall[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET" && url === "/api/v1/nfce/issuer-config") {
        return new Response(JSON.stringify({ data: [{ ...ISSUER_ROW, tef_admin_http_api_key: "chave-vazada-em-claro" }] }), { status: 200 });
      }
      if (method === "GET" && url === "/api/v1/nfce/acbr-config") {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      if (method === "PATCH" && url.startsWith("/api/v1/nfce/issuer-config/")) {
        patchCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.queryByDisplayValue("chave-vazada-em-claro")).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: /Salvar/ })[0]!);

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect("tef_admin_http_api_key" in patchCalls[0]!.body).toBe(false);
  });

  it("segredo digitado é enviado uma vez no PATCH e nunca aparece em claro na tela depois de salvar", async () => {
    const patchCalls: PatchCall[] = [];
    mockFetchWithPatchSpy(patchCalls);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const apiKeyLabel = screen.getByText("API Key");
    const apiKeyInput = apiKeyLabel.parentElement!.querySelector("input")!;
    await userEvent.type(apiKeyInput, "chave-nova-em-claro-123");

    await userEvent.click(screen.getAllByRole("button", { name: /Salvar/ })[0]!);

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    // Enviado exatamente uma vez, com o valor digitado.
    expect(patchCalls[0]!.body.apikey_easyerp).toBe("chave-nova-em-claro-123");

    await waitFor(() => expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument());
    expect(screen.queryByText("chave-nova-em-claro-123")).toBeNull();
    expect(screen.queryByDisplayValue("chave-nova-em-claro-123")).toBeNull();
  });
});
