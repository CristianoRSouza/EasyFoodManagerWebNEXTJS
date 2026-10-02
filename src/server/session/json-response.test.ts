// @vitest-environment node
import { relayBackendResponse } from "./json-response";

describe("relayBackendResponse", () => {
  it("sucesso: corpo intacto, só os cabeçalhos permitidos e os cookies pedidos", async () => {
    const backend = new Response('{"a":1}', {
      status: 201,
      headers: { "content-type": "application/json", "x-internal": "segredo", "set-cookie": "api=1; Path=/" },
    });
    const response = await relayBackendResponse(backend, ["easyfood_session=n; Path=/"]);
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('{"a":1}');
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("x-internal")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["easyfood_session=n; Path=/"]);
  });

  it("erro: corpo normalizado com os cookies pedidos", async () => {
    const backend = new Response(JSON.stringify({ error: "Sem acesso.", error_code: "forbidden" }), { status: 403 });
    const response = await relayBackendResponse(backend, ["efm_session=; Max-Age=0"]);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "forbidden", message: "Sem acesso." });
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Max-Age=0"]);
  });

  it("429 preserva o retry-after", async () => {
    const backend = new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "retry-after": "30" } });
    const response = await relayBackendResponse(backend, []);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
  });
});
