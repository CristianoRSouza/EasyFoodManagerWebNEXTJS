import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { TenantProvider, useTenant } from "./tenant-context";

const routes: Record<string, unknown> = {
  "/api/v1/me/context": { user: { id: "u1", email: "a@b" }, is_system_admin: true, is_company_admin: false, companies: [{ id: "c1", name: "Empresa", cnpj: "1" }] },
  "/api/v1/me/all-stores": [
    { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
    { id: "s2", company_id: "c1", trade_name: "Norte", legacy_store_code: "2", store_type: null, is_default: false },
  ],
  "/api/v1/site-identity": { company_id: "cL", store_id: "sL" },
};

function Probe() {
  const t = useTenant();
  return (
    <div>
      <span data-testid="loading">{String(t.loading)}</span>
      <span data-testid="needs">{String(t.needsSelection)}</span>
      <span data-testid="store">{t.selection?.storeId ?? "-"}</span>
      <span data-testid="company">{t.selectedCompany?.name ?? "-"}</span>
      <span data-testid="admin">{String(t.isSystemAdmin)}</span>
      <span data-testid="selected-store">{t.selectedStore?.trade_name ?? "-"}</span>
      <span data-testid="all-loaded">{String(t.allStoresLoaded)}</span>
      <span data-testid="store-count">{Object.values(t.storesByCompany).flat().length}</span>
      <button onClick={() => t.loadAllStores()}>carregar todas</button>
      <button onClick={() => t.select("c2", "s3")}>escolher s3</button>
    </div>
  );
}

function wrap(runtime: RuntimeInfo, children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <TenantProvider>{children}</TenantProvider>
      </RuntimeProvider>
    </QueryClientProvider>
  );
}

/** `/me/stores` responde as lojas da empresa do cabeçalho `x-company-id`, como a EasyFoodAPI. */
function respond(url: string, init?: RequestInit) {
  if (url === "/api/v1/me/stores") {
    const company = new Headers(init?.headers).get("x-company-id");
    const all = routes["/api/v1/me/all-stores"] as { company_id: string }[];
    return new Response(JSON.stringify(all.filter((s) => s.company_id === company)), { status: 200 });
  }
  return new Response(JSON.stringify(routes[url] ?? {}), { status: routes[url] ? 200 : 404 });
}

function requested(path: string) {
  return vi.mocked(globalThis.fetch).mock.calls.filter(([url]) => String(url) === `/api/v1${path}`);
}

const multiCompanyContext = {
  user: { id: "u1", email: "a@b" },
  is_system_admin: true,
  is_company_admin: false,
  companies: [
    { id: "c1", name: "Empresa", cnpj: "1" },
    { id: "c2", name: "Outra", cnpj: "2" },
  ],
};
const multiCompanyStores = [
  { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
  { id: "s2", company_id: "c1", trade_name: "Norte", legacy_store_code: "2", store_type: null, is_default: false },
  { id: "s3", company_id: "c2", trade_name: "Sul", legacy_store_code: "3", store_type: null, is_default: false },
];
const singleCompanyRoutes = { ...routes };

beforeEach(() => {
  localStorage.clear();
  Object.assign(routes, singleCompanyRoutes);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => respond(String(url), init));
});
afterEach(() => vi.restoreAllMocks());

const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" };
const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" };

describe("TenantProvider", () => {
  it("nuvem com duas lojas e nada salvo pede seleção, mas já mostra a empresa única", async () => {
    render(wrap(cloud, <Probe />));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("needs")).toHaveTextContent("true");
    expect(screen.getByTestId("company")).toHaveTextContent("Empresa");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
  });

  it("nuvem restaura a loja salva no navegador", async () => {
    localStorage.setItem("cp.selectedCompanyId", "c1");
    localStorage.setItem("cp.selectedStoreId", "s2");
    render(wrap(cloud, <Probe />));
    await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("s2"));
    expect(screen.getByTestId("needs")).toHaveTextContent("false");
  });

  it("loja usa a identidade fixa da instalação e nunca pede seleção", async () => {
    render(wrap(lan, <Probe />));
    await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("sL"));
    expect(screen.getByTestId("needs")).toHaveTextContent("false");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
  });

  describe("paridade com o legado: lojas da empresa em /me/stores, todas só no seletor (validação de produção)", () => {
    it("na carga da página busca /me/stores com o cabeçalho da empresa e NÃO busca /me/all-stores", async () => {
      localStorage.setItem("cp.selectedCompanyId", "c1");
      localStorage.setItem("cp.selectedStoreId", "s2");
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("selected-store")).toHaveTextContent("Norte"));
      const calls = requested("/me/stores");
      expect(calls).toHaveLength(1);
      expect(new Headers(calls[0]![1]?.headers).get("x-company-id")).toBe("c1");
      expect(requested("/me/all-stores")).toHaveLength(0);
      expect(screen.getByTestId("all-loaded")).toHaveTextContent("false");
      // cabeçalho: só com as lojas da empresa já sabe que há mais de uma loja (canChange)
      expect(screen.getByTestId("store-count")).toHaveTextContent("2");
    });

    it("empresa única sem nada salvo também usa /me/stores (empresa auto-selecionada, como no legado)", async () => {
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
      expect(requested("/me/stores")).toHaveLength(1);
      expect(requested("/me/all-stores")).toHaveLength(0);
      expect(screen.getByTestId("needs")).toHaveTextContent("true");
    });

    it("empresa única com loja única é auto-selecionada sem /me/all-stores", async () => {
      routes["/api/v1/me/all-stores"] = [
        { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
      ];
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("s1"));
      expect(screen.getByTestId("needs")).toHaveTextContent("false");
      expect(screen.getByTestId("selected-store")).toHaveTextContent("Centro");
      expect(requested("/me/all-stores")).toHaveLength(0);
    });

    it("loadAllStores() (seletor aberto) busca /me/all-stores uma vez e preenche storesByCompany de todas as empresas", async () => {
      routes["/api/v1/me/context"] = multiCompanyContext;
      routes["/api/v1/me/all-stores"] = multiCompanyStores;
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
      expect(screen.getByTestId("needs")).toHaveTextContent("true");
      // várias empresas e nada salvo: não há empresa para perguntar /me/stores
      expect(requested("/me/stores")).toHaveLength(0);
      expect(requested("/me/all-stores")).toHaveLength(0);

      act(() => screen.getByText("carregar todas").click());
      await waitFor(() => expect(screen.getByTestId("all-loaded")).toHaveTextContent("true"));
      expect(screen.getByTestId("store-count")).toHaveTextContent("3");
      act(() => screen.getByText("carregar todas").click());
      expect(requested("/me/all-stores")).toHaveLength(1);
    });

    it("várias empresas: restaura a empresa/loja salvas pedindo /me/stores da empresa salva", async () => {
      routes["/api/v1/me/context"] = multiCompanyContext;
      routes["/api/v1/me/all-stores"] = multiCompanyStores;
      localStorage.setItem("cp.selectedCompanyId", "c2");
      localStorage.setItem("cp.selectedStoreId", "s3");
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("s3"));
      expect(screen.getByTestId("company")).toHaveTextContent("Outra");
      expect(screen.getByTestId("selected-store")).toHaveTextContent("Sul");
      expect(new Headers(requested("/me/stores")[0]![1]?.headers).get("x-company-id")).toBe("c2");
      expect(requested("/me/all-stores")).toHaveLength(0);
    });

    it("várias empresas: empresa salva com loja única, mas sem loja salva, continua pedindo seleção (igual a antes)", async () => {
      routes["/api/v1/me/context"] = multiCompanyContext;
      routes["/api/v1/me/all-stores"] = multiCompanyStores;
      localStorage.setItem("cp.selectedCompanyId", "c2");
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
      expect(screen.getByTestId("needs")).toHaveTextContent("true");
    });

    it("trocar para loja de outra empresa no seletor passa a pedir /me/stores dessa empresa", async () => {
      routes["/api/v1/me/context"] = multiCompanyContext;
      routes["/api/v1/me/all-stores"] = multiCompanyStores;
      localStorage.setItem("cp.selectedCompanyId", "c1");
      localStorage.setItem("cp.selectedStoreId", "s1");
      render(wrap(cloud, <Probe />));
      await waitFor(() => expect(screen.getByTestId("selected-store")).toHaveTextContent("Centro"));
      act(() => screen.getByText("escolher s3").click());
      await waitFor(() => expect(screen.getByTestId("selected-store")).toHaveTextContent("Sul"));
      expect(screen.getByTestId("company")).toHaveTextContent("Outra");
      const companies = requested("/me/stores").map(([, init]) => new Headers(init?.headers).get("x-company-id"));
      expect(companies).toEqual(["c1", "c2"]);
      expect(localStorage.getItem("cp.selectedStoreId")).toBe("s3");
    });
  });
});
