import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiAssistantRepository } from "./api-assistant-repository";
import { ChatError } from "../domain/chat";

const tenant = { companyId: "c1", storeId: "s1" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function mockFetch(...responses: Response[]) {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const r of responses) spy.mockResolvedValueOnce(r);
  return spy;
}

const lastCall = (spy: ReturnType<typeof mockFetch>, index = 0) => {
  const [url, init] = spy.mock.calls[index] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
};

afterEach(() => vi.restoreAllMocks());

describe("ApiAssistantRepository", () => {
  const repo = new ApiAssistantRepository(tenant);

  it("sessions: GET /ai/sessions com empresa/loja nos cabeçalhos, linhas convertidas", async () => {
    const spy = mockFetch(
      json({
        data: [
          {
            id: "a", user_id: "u1", day: "2026-09-30", app: "easyfood-manager",
            messages: [{ role: "user", content: "oi" }], started_at: "2026-09-30T10:00:00Z", ended_at: "2026-09-30T10:01:00Z",
          },
          { id: "b", user_id: "u2", day: "2026-09-29", app: null, messages: "lixo", started_at: null, ended_at: null },
        ],
      }),
    );
    const sessions = await repo.sessions();
    const { url, headers } = lastCall(spy);
    expect(url).toBe("/api/v1/ai/sessions");
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
    expect(sessions[0]).toEqual({
      id: "a", userId: "u1", day: "2026-09-30", app: "easyfood-manager",
      messages: [{ role: "user", content: "oi" }], startedAt: "2026-09-30T10:00:00Z", endedAt: "2026-09-30T10:01:00Z",
    });
    expect(sessions[1]).toMatchObject({ id: "b", app: null, messages: [] });
  });

  it("currentUserId: /auth/me; falha vira null", async () => {
    mockFetch(json({ id: "u1", email: "a@b" }));
    expect(await repo.currentUserId()).toBe("u1");
    vi.restoreAllMocks();
    mockFetch(json({ message: "x" }, 500));
    expect(await repo.currentUserId()).toBeNull();
  });

  it("saveToday: PUT /ai/sessions/today com mensagens e datas; devolve o id", async () => {
    const spy = mockFetch(json({ data: { id: "row-1" } }));
    const id = await repo.saveToday([{ role: "user", content: "oi", ts: 1 }], "2026-09-30T10:00:00.000Z", "2026-09-30T10:01:00.000Z");
    const { url, init } = lastCall(spy);
    expect(url).toBe("/api/v1/ai/sessions/today");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      messages: [{ role: "user", content: "oi", ts: 1 }],
      started_at: "2026-09-30T10:00:00.000Z",
      ended_at: "2026-09-30T10:01:00.000Z",
    });
    expect(id).toBe("row-1");
  });

  it("deleteSession e clearHistory: DELETE nas rotas do legado", async () => {
    const spy = mockFetch(json({ data: { deleted: 1 } }), json({ data: { deleted: 3 } }));
    await repo.deleteSession("a b");
    await repo.clearHistory();
    expect(lastCall(spy, 0).url).toBe("/api/v1/ai/sessions/a%20b");
    expect(lastCall(spy, 0).init.method).toBe("DELETE");
    expect(lastCall(spy, 1).url).toBe("/api/v1/ai/sessions");
    expect(lastCall(spy, 1).init.method).toBe("DELETE");
  });

  it("usage e creditAmounts: /billing/usage e /billing/credits com limit=200", async () => {
    const spy = mockFetch(
      json({ data: [{ created_at: "2026-09-30T12:00:00Z", was_free: true, action: "support" }] }),
      json({ data: [{ amount: "10.5" }, { amount: -2 }] }),
    );
    expect(await repo.usage()).toEqual([{ createdAt: "2026-09-30T12:00:00Z", wasFree: true, action: "support" }]);
    expect(await repo.creditAmounts()).toEqual([10.5, -2]);
    expect(lastCall(spy, 0).url).toBe("/api/v1/billing/usage?limit=200");
    expect(lastCall(spy, 1).url).toBe("/api/v1/billing/credits?limit=200");
  });

  describe("ask (SSE)", () => {
    it("POST /ai/chat só com as mensagens; cabeçalhos de tenant e Accept SSE; entrega os pedaços", async () => {
      const sse = 'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\ndata: [DONE]\n';
      const spy = mockFetch(new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } }));
      const deltas: string[] = [];
      await repo.ask([{ role: "user", content: "oi" }], (t) => deltas.push(t), new AbortController().signal);
      const { url, init, headers } = lastCall(spy);
      expect(url).toBe("/api/v1/ai/chat");
      expect(init.method).toBe("POST");
      expect(headers.get("accept")).toBe("text/event-stream");
      expect(headers.get("x-company-id")).toBe("c1");
      expect(headers.get("x-store-id")).toBe("s1");
      expect(JSON.parse(String(init.body))).toEqual({ messages: [{ role: "user", content: "oi" }] });
      expect(deltas).toEqual(["Oi"]);
    });

    it("402 vira ChatError com o texto do legado", async () => {
      mockFetch(json({ code: "payment_required", message: "sem saldo" }, 402));
      await expect(repo.ask([], () => undefined, new AbortController().signal)).rejects.toEqual(
        new ChatError(402, "Créditos insuficientes. Acesse Créditos IA."),
      );
    });

    it("erro de rede vira ChatError(0); abort é repassado como AbortError", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await expect(repo.ask([], () => undefined, new AbortController().signal)).rejects.toMatchObject({
        status: 0,
        message: "Não foi possível falar com o assistente agora.",
      });
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("abortado", "AbortError"));
      await expect(repo.ask([], () => undefined, new AbortController().signal)).rejects.toMatchObject({ name: "AbortError" });
    });
  });
});
