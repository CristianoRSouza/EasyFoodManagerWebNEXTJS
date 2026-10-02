import { render, screen } from "@testing-library/react";
import { CompanySelectionModal } from "./CompanySelectionModal";

const tenant = vi.hoisted(() => ({
  loading: false,
  companies: [{ id: "c1", name: "Empresa Demo", cnpj: "" }],
  storesByCompany: {} as Record<string, { id: string; company_id: string; trade_name: string; legacy_store_code: string }[]>,
  allStoresLoaded: false,
  loadAllStores: vi.fn(),
  selection: null,
  selectedCompany: null,
  selectedStore: null,
  needsSelection: true,
  isSystemAdmin: false,
  isCompanyAdmin: false,
  select: vi.fn(),
  refresh: vi.fn(async () => undefined),
}));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

beforeEach(() => {
  tenant.loadAllStores.mockReset();
  tenant.allStoresLoaded = false;
  tenant.storesByCompany = {};
});

describe("CompanySelectionModal — /me/all-stores só quando o seletor abre (paridade com o legado)", () => {
  it("fechado não pede todas as lojas", () => {
    render(<CompanySelectionModal open={false} />);
    expect(tenant.loadAllStores).not.toHaveBeenCalled();
  });

  it("aberto pede todas as lojas e mostra o carregando até elas chegarem", () => {
    render(<CompanySelectionModal open />);
    expect(tenant.loadAllStores).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Centro")).not.toBeInTheDocument();
  });

  it("aberto com as lojas já carregadas não pede de novo e lista as lojas", () => {
    tenant.allStoresLoaded = true;
    tenant.storesByCompany = { c1: [{ id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1" }] };
    render(<CompanySelectionModal open />);
    expect(tenant.loadAllStores).not.toHaveBeenCalled();
    expect(screen.getByText("Centro")).toBeInTheDocument();
  });
});
