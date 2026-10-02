import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
const tenant = vi.hoisted(() => ({
  loading: false, companies: [], storesByCompany: {}, allStoresLoaded: false, loadAllStores: vi.fn(), selection: { companyId: "c1", storeId: "s1" } as null | { companyId: string; storeId: string },
  selectedCompany: null, selectedStore: null, needsSelection: false, isSystemAdmin: false, isCompanyAdmin: false,
  select: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const { AppLayout } = await import("./AppLayout");

function renderLayout(runtime: Pick<RuntimeInfo, "backend">, license: unknown = { state: "active" }) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    String(input).startsWith("/api/v1/billing/license")
      ? new Response(JSON.stringify({ data: license }))
      : new Response(null, { status: 404 }),
  );
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={{ ...runtime, apiDisplayOrigin: "api", adminPlatformUrl: "https://b" }}>
        <TooltipProvider>
          {/* O botão real é do módulo `assistant`, injetado pelo `app/(panel)/layout.tsx`. */}
          <AppLayout assistant={<button type="button" aria-label="Abrir Assistente IA" />}>
            <p>conteúdo</p>
          </AppLayout>
        </TooltipProvider>
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  tenant.selection = { companyId: "c1", storeId: "s1" };
});

describe("AppLayout — Fase 5 (assistente e licença, só nuvem)", () => {
  it("nuvem com loja: botão do assistente e faixa de licença vencida", async () => {
    renderLayout({ backend: "cloud" }, { state: "expired", planSlug: "p", planName: "Plano X" });
    expect(screen.getByRole("button", { name: "Abrir Assistente IA" })).toBeInTheDocument();
    expect(await screen.findByText("Seu plano expirou e não foi renovado.")).toBeInTheDocument();
  });

  it("nuvem sem loja: sem botão do assistente", () => {
    tenant.selection = null;
    renderLayout({ backend: "cloud" });
    expect(screen.queryByRole("button", { name: "Abrir Assistente IA" })).toBeNull();
  });

  it("loja (LAN): sem assistente e sem consulta de licença", () => {
    renderLayout({ backend: "lan" });
    expect(screen.queryByRole("button", { name: "Abrir Assistente IA" })).toBeNull();
    const calls = vi.mocked(globalThis.fetch).mock.calls.map(([input]) => String(input));
    expect(calls.some((url) => url.includes("/billing/") || url.includes("/ai/"))).toBe(false);
  });
});
