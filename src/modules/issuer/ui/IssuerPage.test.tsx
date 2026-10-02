import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { IssuerPage } = await import("./IssuerPage");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };

function renderPage(runtime: RuntimeInfo = lan) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <IssuerPage />
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

const BASE_CONFIG_ROW = {
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
  aditum_tef_partner_token_encrypted_set: false,
  aditum_tef_activation_code_encrypted_set: false,
  issuer_sensitive_secrets_ready: true,
  tef_admin_http_base_url: null,
  tef_admin_http_api_key: null,
  companyid_easyerp: null,
  storeid_easyerp: null,
  easyerp_api_key_set: false,
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

afterEach(() => vi.restoreAllMocks());

describe("IssuerPage", () => {
  it("mostra o estado de carregamento antes da resposta chegar", async () => {
    let resolveFetch: (r: Response) => void = () => undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    renderPage();
    expect(screen.getByText("Carregando cadastro do emitente...")).toBeInTheDocument();

    resolveFetch(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await waitFor(() => expect(screen.queryByText("Carregando cadastro do emitente...")).toBeNull());
  });

  it("estado vazio: nenhum emitente cadastrado", async () => {
    mockFetch({
      "/api/v1/nfce/issuer-config": { status: 200, body: { data: [] } },
      "/api/v1/nfce/acbr-config": { status: 200, body: { data: [] } },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nenhuma configuração de emitente encontrada.")).toBeInTheDocument());
  });

  it("estado de erro: a API falha — cai no mesmo card do estado vazio, igual ao legado (loadData só loga no console)", async () => {
    mockFetch({ "/api/v1/nfce/issuer-config": { status: 500, body: { message: "database_error" } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nenhuma configuração de emitente encontrada.")).toBeInTheDocument());
  });

  it("estado com dados: mostra o emitente, badges e seções, com o cadastro ACBr", async () => {
    mockFetch({
      "/api/v1/nfce/issuer-config": { status: 200, body: { data: [BASE_CONFIG_ROW] } },
      "/api/v1/nfce/acbr-config": {
        status: 200,
        body: { data: [{ id: "a1", key: "ChaveCSC", value: "abc123", description: "CSC", updated_at: "2026-01-01T10:00:00Z" }] },
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Exemplo Lanches").length).toBeGreaterThan(0));
    expect(screen.getByText("✓ Ativo")).toBeInTheDocument();
    expect(screen.getAllByText("Homologação").length).toBeGreaterThan(0);
    expect(screen.getByText("Restaurante Exemplo Ltda")).toBeInTheDocument();
    expect(screen.getByText("1 parâmetros")).toBeInTheDocument();
    expect(screen.getByText("ChaveCSC")).toBeInTheDocument();
  });

  it("série NFC-e nula (visto na produção) aparece como no legado — String(null) — e não vira 0", async () => {
    mockFetch({
      "/api/v1/nfce/issuer-config": { status: 200, body: { data: [{ ...BASE_CONFIG_ROW, nfce_serie: null }] } },
      "/api/v1/nfce/acbr-config": { status: 200, body: { data: [] } },
    });

    renderPage();

    const label = await screen.findByText("Série NFC-e");
    const row = label.parentElement!;
    expect(row).toHaveTextContent("null");
    expect(row).not.toHaveTextContent(/\b0\b/);
  });

  it("INVARIANTE 2 — segredos do emitente nunca aparecem em claro, mesmo se a API os devolvesse", async () => {
    // A API real nunca devolve isto (mapIssuerRowToClient remove antes de responder); simulado
    // aqui só para provar que, MESMO que um bug do servidor vazasse o valor, esta tela não o exibe.
    mockFetch({
      "/api/v1/nfce/issuer-config": {
        status: 200,
        body: {
          data: [
            {
              ...BASE_CONFIG_ROW,
              aditum_tef_partner_token: "TOKEN-SECRETO-EM-CLARO",
              aditum_tef_activation_code: "CODIGO-SECRETO-EM-CLARO",
              apikey_easyerp: "APIKEY-SECRETA-EM-CLARO",
              aditum_tef_partner_token_encrypted_set: true,
              aditum_tef_activation_code_encrypted_set: true,
              easyerp_api_key_set: true,
            },
          ],
        },
      },
      "/api/v1/nfce/acbr-config": { status: 200, body: { data: [] } },
    });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Exemplo Lanches").length).toBeGreaterThan(0));

    expect(screen.queryByText("TOKEN-SECRETO-EM-CLARO")).toBeNull();
    expect(screen.queryByText("CODIGO-SECRETO-EM-CLARO")).toBeNull();
    expect(screen.queryByText("APIKEY-SECRETA-EM-CLARO")).toBeNull();
    expect(screen.queryByText(/TOKEN-SECRETO|CODIGO-SECRETO|APIKEY-SECRETA/)).toBeNull();

    expect(screen.getAllByText("•••••••• (definido — cifrado na BD)").length).toBe(2);
    expect(screen.getByText("•••••••• (definida)")).toBeInTheDocument();
  });
});
