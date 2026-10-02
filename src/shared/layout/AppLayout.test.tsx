import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("next/navigation", () => ({ usePathname: () => "/nfce/1", useRouter: () => ({ replace: vi.fn() }) }));
const tenant = {
  loading: false, companies: [], storesByCompany: {}, allStoresLoaded: false, loadAllStores: vi.fn(), selection: null as null | { companyId: string; storeId: string },
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

  it("modo nuvem com sessão da EasyFoodAPI não mostra o menu do usuário (legado na homologação, 2026-10-01)", async () => {
    // No legado o ícone só aparece com sessão SUPABASE (`cloudGetSession()` em `AppLayout.tsx`);
    // com o login da EasyFoodAPI essa sessão não existe — a homologação real não mostra o menu.
    tenant.selection = { companyId: "c", storeId: "s" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url) === "/api/session"
        ? new Response(JSON.stringify({ user: { id: "u1", email: "a@b.com" } }), { status: 200 })
        : new Response(null, { status: 401 }),
    );
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <RuntimeProvider value={{ backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" }}>
          <AppLayout>
            <p>conteúdo</p>
          </AppLayout>
        </RuntimeProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container.querySelector("header svg.lucide-user")).toBeNull();
    fetchSpy.mockRestore();
  });

  it("modo loja: sem a identidade do servidor ainda, o conteúdo espera (as telas exigem o tenant)", () => {
    tenant.selection = null;
    tenant.loading = true;
    renderLayout({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" });
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("modo loja: identidade do servidor indisponível vira aviso, nunca a tela sem tenant", () => {
    tenant.selection = null;
    tenant.loading = false;
    renderLayout({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" });
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByText("Não foi possível identificar a loja deste servidor.")).toBeInTheDocument();
  });
});
