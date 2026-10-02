import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import { ProductFiscalDetails } from "./ProductFiscalDetails";

vi.mock("@/shared/http/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/runtime/runtime-context", () => ({
  useRuntime: () => ({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "" }),
}));

const tenantMock = vi.fn();
vi.mock("@/shared/tenant/use-required-tenant", () => ({ useRequiredTenant: () => tenantMock() }));

const mockedApiRequest = vi.mocked(apiRequest);

function renderWithClient(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ProductFiscalDetails productId="p1" />
    </QueryClientProvider>,
  );
}

describe("ProductFiscalDetails — cache por tenant", () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("troca de empresa não reaproveita, do cache, os dados fiscais de outra empresa (I3)", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { ncm: "1111", identification: {}, icms: {}, pis: {}, cofins: {}, taxReform: {} },
    });

    const client = new QueryClient();

    tenantMock.mockReturnValue({ companyId: "empresa-a", storeId: "loja-a" });
    const first = renderWithClient(client);
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(1));
    first.unmount();

    tenantMock.mockReturnValue({ companyId: "empresa-b", storeId: "loja-b" });
    renderWithClient(client);

    // Se a chave não incluísse o tenant, o cache (compartilhado no mesmo QueryClient) devolveria
    // o resultado da empresa A sem uma segunda chamada.
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(2));
  });
});
