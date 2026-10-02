import { renderHook } from "@testing-library/react";
import { useTenant, type TenantState } from "./tenant-context";
import { useRequiredTenant } from "./use-required-tenant";

vi.mock("./tenant-context", () => ({ useTenant: vi.fn() }));

const mockedUseTenant = vi.mocked(useTenant);

function tenantState(selection: TenantState["selection"]): TenantState {
  return {
    loading: false,
    companies: [],
    storesByCompany: {},
    allStoresLoaded: false,
    loadAllStores: vi.fn(),
    selection,
    selectedCompany: null,
    selectedStore: null,
    needsSelection: !selection,
    isSystemAdmin: false,
    isCompanyAdmin: false,
    select: vi.fn(),
    refresh: vi.fn(),
  };
}

describe("useRequiredTenant", () => {
  it("devolve a seleção quando há empresa e loja escolhidas", () => {
    mockedUseTenant.mockReturnValue(tenantState({ companyId: "c1", storeId: "s1" }));

    const { result } = renderHook(() => useRequiredTenant());

    expect(result.current).toEqual({ companyId: "c1", storeId: "s1" });
  });

  it("lança erro quando não há loja selecionada", () => {
    mockedUseTenant.mockReturnValue(tenantState(null));

    expect(() => renderHook(() => useRequiredTenant())).toThrow(/nenhuma loja selecionada/i);
  });
});
