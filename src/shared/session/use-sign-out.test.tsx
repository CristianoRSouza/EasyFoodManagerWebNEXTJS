import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const sessionClient = { logout: vi.fn() };
vi.mock("@/shared/session/session-client", () => ({ sessionClient }));

const { useSignOut } = await import("./use-sign-out");

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["tenant", "companies"], [{ id: "c1" }]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSignOut(), { wrapper });
  return { queryClient, signOut: result.current };
}

beforeEach(() => vi.clearAllMocks());

describe("useSignOut", () => {
  it("encerra a sessão, esvazia o cache e vai para /login", async () => {
    sessionClient.logout.mockResolvedValue(undefined);
    const { queryClient, signOut } = setup();
    await signOut();
    expect(sessionClient.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("falha no logout não impede limpar o cache nem sair", async () => {
    sessionClient.logout.mockRejectedValue(new Error("rede"));
    const { queryClient, signOut } = setup();
    await signOut();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
