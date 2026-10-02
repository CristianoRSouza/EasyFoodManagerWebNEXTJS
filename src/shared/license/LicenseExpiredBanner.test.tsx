import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";

const tenantState = vi.hoisted(() => ({
  selection: { companyId: "c1", storeId: "s1" } as { companyId: string; storeId: string } | null,
  selectedCompany: null as { id: string } | null,
}));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenantState }));

const { LicenseExpiredBanner } = await import("./LicenseExpiredBanner");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function renderBanner(backend: "cloud" | "lan" = "cloud") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "api", adminPlatformUrl: "https://billing.test" }}>
        <LicenseExpiredBanner />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  tenantState.selection = { companyId: "c1", storeId: "s1" };
  tenantState.selectedCompany = null;
});

describe("LicenseExpiredBanner", () => {
  it("expirada: faixa vermelha com os textos do legado", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ data: { state: "expired", planSlug: "s1", planName: "Standard 1", expiresAt: "2026-09-20T12:00:00Z", isActive: true, daysUntilExpiry: -10 } }),
    );
    renderBanner();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Seu plano expirou e não foi renovado.");
    expect(alert).toHaveTextContent("A licença do plano Standard 1 venceu em 20/09/2026.");
    expect(alert.className).toContain("bg-destructive/15");
    expect(screen.getByRole("button", { name: "Revisar pagamento" })).toBeEnabled();
  });

  it("expirando: faixa âmbar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ data: { state: "expiring_soon", planSlug: "s1", planName: null, expiresAt: null, isActive: true, daysUntilExpiry: 4 } }),
    );
    renderBanner();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Renovação do plano pendente.");
    expect(alert).toHaveTextContent("Sua licença expira em 4 dia(s).");
    expect(alert.className).toContain("bg-amber-500/15");
  });

  it("ativa, erro ou carregando: nada", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ data: { state: "active", planSlug: "s1" } }));
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement(); // carregando
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    spy.mockResolvedValue(json({ message: "x" }, 500));
    const other = renderBanner();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(other.container).toBeEmptyDOMElement();
  });

  it("loja (LAN) ou sem empresa selecionada: não consulta", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    renderBanner("lan");
    tenantState.selection = null;
    renderBanner("cloud");
    expect(spy).not.toHaveBeenCalled();
  });

  it("Menor 7 — licença é da EMPRESA (como o legado): com empresa escolhida e sem loja já consulta, só com x-company-id", async () => {
    tenantState.selection = null;
    tenantState.selectedCompany = { id: "c1" };
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ data: { state: "expired", planSlug: "s1", planName: "Standard 1" } }));
    renderBanner();
    expect(await screen.findByRole("alert")).toHaveTextContent("Seu plano expirou e não foi renovado.");
    const headers = new Headers((spy.mock.calls[0] as [string, RequestInit])[1].headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBeNull();
  });

  it("Menor 7 — trocar de loja na mesma empresa não consulta de novo (chave por empresa)", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ data: { state: "active", planSlug: "s1" } }));
    const tree = () => (
      <QueryClientProvider client={client}>
        <RuntimeProvider value={{ backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://billing.test" }}>
          <LicenseExpiredBanner />
        </RuntimeProvider>
      </QueryClientProvider>
    );
    const view = render(tree());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    tenantState.selection = { companyId: "c1", storeId: "s2" };
    view.rerender(tree());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("'Revisar pagamento' abre o EasyBilling via SSO", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/auth/derived-session")
        ? json({ token_hash: "abc" })
        : json({ data: { state: "expired", planSlug: "s1" } }),
    );
    renderBanner();
    await userEvent.click(await screen.findByRole("button", { name: "Revisar pagamento" }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(String(open.mock.calls[0]?.[0])).toContain("https://billing.test/sso?sso_token=abc");
  });
});
