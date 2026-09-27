// @vitest-environment node
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("sem cookie de sessão, página do painel vai para /login", () => {
    const response = proxy(new NextRequest("http://x/products"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://x/login");
  });

  it("com cookie de sessão de qualquer backend, segue", () => {
    for (const cookie of ["efm_session=t", "efa_session=t"]) {
      const response = proxy(new NextRequest("http://x/products", { headers: { cookie } }));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("páginas públicas passam sem sessão", () => {
    for (const path of ["/login", "/reset-password"]) {
      expect(proxy(new NextRequest(`http://x${path}`)).headers.get("location")).toBeNull();
    }
  });
});
