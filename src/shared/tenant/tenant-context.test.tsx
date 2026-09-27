import { render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    new Response(JSON.stringify(routes[String(url)] ?? {}), { status: routes[String(url)] ? 200 : 404 }),
  );
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
});
