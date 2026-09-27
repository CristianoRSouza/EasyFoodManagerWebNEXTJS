import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("next/navigation", () => ({ usePathname: () => "/nfce/1", useRouter: () => ({ replace: vi.fn() }) }));
const tenant = {
  loading: false, companies: [], storesByCompany: {}, selection: null as null | { companyId: string; storeId: string },
  selectedCompany: null, selectedStore: null, needsSelection: false, isSystemAdmin: false, isCompanyAdmin: false,
  select: vi.fn(), refresh: vi.fn(),
};
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const { AppLayout } = await import("./AppLayout");

function renderLayout(runtime: RuntimeInfo) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RuntimeProvider value={runtime}>
        <AppLayout>
          <p>conteúdo</p>
        </AppLayout>
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

describe("AppLayout", () => {
  it("modo loja: badge Admin API com a origem, conteúdo liberado e item ativo destacado", () => {
    tenant.selection = { companyId: "c", storeId: "s" };
    renderLayout({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" });
    expect(screen.getByText("Admin API")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:4080")).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NFC-e" }).className).toContain("bg-sidebar-accent");
    expect(screen.getByText("Espelho FB↔PG")).toBeInTheDocument();
  });

  it("modo nuvem sem loja bloqueia o conteúdo com o aviso do legado", () => {
    tenant.selection = null;
    renderLayout({ backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" });
    expect(screen.getByText("Selecione uma loja para continuar")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByText("EasyFoodAPI")).toBeInTheDocument();
  });
});
