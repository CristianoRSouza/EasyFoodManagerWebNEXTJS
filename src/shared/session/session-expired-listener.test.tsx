import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SESSION_EXPIRED_EVENT } from "@/shared/http/session-events";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const { SessionExpiredListener } = await import("./session-expired-listener");

describe("SessionExpiredListener", () => {
  it("sessão expirada esvazia o cache e leva ao login com o aviso", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["session", "user"], { id: "u1", email: "a@b" });
    render(
      <QueryClientProvider client={queryClient}>
        <SessionExpiredListener />
      </QueryClientProvider>,
    );
    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(replace).toHaveBeenCalledWith("/login?expired=1");
  });
});
