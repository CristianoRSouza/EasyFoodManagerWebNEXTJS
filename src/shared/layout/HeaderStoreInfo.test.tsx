import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";

const tenant = vi.hoisted(() => ({
  selection: { companyId: "c1", storeId: "s1" },
  selectedCompany: { id: "c1", name: "Empresa Demo", cnpj: "" },
  selectedStore: { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1" },
  companies: [{ id: "c1", name: "Empresa Demo", cnpj: "" }],
  storesByCompany: { c1: [{ id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1" }] },
  allStoresLoaded: false,
  loadAllStores: vi.fn(),
}));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const { HeaderStoreInfo } = await import("./HeaderStoreInfo");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockApi(planWindow: unknown, license: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("/api/v1/billing/plan-window")) return json(planWindow);
    if (url.startsWith("/api/v1/billing/license")) return json(license);
    return json({}, 404);
  });
}

function renderHeader(backend: "cloud" | "lan" = "cloud") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "api", adminPlatformUrl: "https://b" }}>
        <HeaderStoreInfo onOpenModal={vi.fn()} />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("HeaderStoreInfo — plano e licença", () => {
  it("mostra o selo do plano e o alerta de licença expirada", async () => {
    mockApi(
      { data: { planSlug: "standard-1", planName: "Standard 1", historyWindowDays: 90 } },
      { data: { state: "expired", planSlug: "standard-1", planName: "Standard 1", expiresAt: null, isActive: false, daysUntilExpiry: null } },
    );
    renderHeader();
    expect(await screen.findByText("Standard 1")).toBeInTheDocument();
    const warning = await screen.findByLabelText("Plano expirado");
    expect(warning.className).toContain("text-destructive");
  });

  it("licença expirando: alerta âmbar", async () => {
    mockApi(
      { data: { planSlug: "standard-1", planName: null, historyWindowDays: null } },
      { data: { state: "expiring_soon", planSlug: "standard-1", daysUntilExpiry: 3 } },
    );
    renderHeader();
    const warning = await screen.findByLabelText("Plano próximo do vencimento");
    expect(warning.className).toContain("text-amber-500");
  });

  it("licença ativa e sem plano: só empresa/loja, sem selo nem alerta", async () => {
    mockApi({ data: { planSlug: null, planName: null, historyWindowDays: null } }, { data: { state: "active", planSlug: "x" } });
    renderHeader();
    expect(screen.getByText("Empresa Demo")).toBeInTheDocument();
    expect(screen.getByText("1 – Centro")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByLabelText(/Plano/)).toBeNull();
  });
});
