import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, routeFetch, sse, today, wrapper } from "./assistant.test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/nfce", useRouter: () => ({ push }) }));
// Objeto ESTÁVEL, como o do TenantProvider: o repositório é memorizado pela seleção.
const tenantState = vi.hoisted(() => ({ selection: { companyId: "c1", storeId: "s1" } }));
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenantState }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock("@/shared/ui/primitives/sonner", () => ({ toast }));

const { AIChatPanel } = await import("./AIChatPanel");
const { AIChatButton } = await import("./AIChatButton");

const session = (over: Record<string, unknown>) => ({
  id: "t1", user_id: "u1", day: today(), app: "easyfood-manager", messages: [],
  started_at: "2026-09-30T10:00:00Z", ended_at: "2026-09-30T10:05:00Z", ...over,
});

const baseRoutes = {
  "GET /api/v1/auth/me": () => json({ id: "u1", email: "a@b.com" }),
  "GET /api/v1/billing/usage": () => json({ data: [] }),
  "GET /api/v1/billing/credits": () => json({ data: [] }),
  "PUT /api/v1/ai/sessions/today": () => json({ data: { id: "t1" } }),
};

const renderPanel = () => render(<AIChatPanel open onClose={vi.fn()} />, { wrapper });

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("AIChatPanel", () => {
  it("vazio: saudação, sugestões da página e a cota grátis do dia", async () => {
    routeFetch({ ...baseRoutes, "GET /api/v1/ai/sessions": () => json({ data: [] }) });
    renderPanel();
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeInTheDocument();
    expect(screen.getByText("Como consulto uma NFC-e?")).toBeInTheDocument();
    expect(await screen.findByText("10 consultas grátis hoje")).toBeInTheDocument();
  });

  it("carregando/erro: falha ao listar conversas não quebra a tela (segue vazia, como o legado)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    routeFetch({ ...baseRoutes, "GET /api/v1/ai/sessions": () => json({ message: "fora" }, 500) });
    renderPanel();
    await waitFor(() => expect(warn).toHaveBeenCalledWith("[useAIChat] load error:", expect.anything()));
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeInTheDocument();
  });

  it("com dados: abre a conversa de hoje e conta o histórico; sem cota, mostra o saldo", async () => {
    const usedToday = Array.from({ length: 10 }, (_, i) => ({ id: String(i), created_at: new Date().toISOString(), was_free: true, action: "chat" }));
    routeFetch({
      ...baseRoutes,
      "GET /api/v1/billing/usage": () => json({ data: usedToday }),
      "GET /api/v1/billing/credits": () => json({ data: [{ amount: 3 }] }),
      "GET /api/v1/ai/sessions": () =>
        json({
          data: [
            session({ messages: [{ role: "user", content: "Como emito?" }, { role: "assistant", content: "Use o **menu** NFC-e." }] }),
            session({ id: "old", day: "2026-09-01", messages: [{ role: "user", content: "antiga" }] }),
            session({ id: "colega", user_id: "u2", messages: [{ role: "user", content: "do colega" }] }),
          ],
        }),
    });
    renderPanel();
    expect(await screen.findByText("Como emito?")).toBeInTheDocument();
    expect(screen.getByText("menu").tagName).toBe("STRONG");
    expect(screen.queryByText("do colega")).toBeNull();
    expect(await screen.findByText("3 créditos disponíveis")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // selo do histórico
  });

  it("envia, recebe o SSE em pedaços e grava a conversa do dia", async () => {
    const saved: unknown[] = [];
    routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": () => json({ data: [] }),
      "POST /api/v1/ai/chat": () => sse("Olá", ", tudo bem?"),
      "PUT /api/v1/ai/sessions/today": (init) => {
        saved.push(JSON.parse(String(init.body)));
        return json({ data: { id: "t1" } });
      },
    });
    renderPanel();
    await userEvent.type(screen.getByPlaceholderText(/Pergunte algo/), "Oi{Enter}");
    expect(await screen.findByText("Olá, tudo bem?")).toBeInTheDocument();
    await waitFor(() =>
      expect(saved.at(-1)).toMatchObject({
        messages: [
          { role: "user", content: "Oi" },
          { role: "assistant", content: "Olá, tudo bem?" },
        ],
      }),
    );
  });

  it("402: toast com o texto do legado e nenhuma bolha vazia", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": () => json({ data: [] }),
      "POST /api/v1/ai/chat": () => json({ code: "payment_required", message: "x" }, 402),
    });
    renderPanel();
    await userEvent.click(screen.getByText("Onde vejo o XML?"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Créditos insuficientes. Acesse Créditos IA."));
    expect(screen.getByText("Onde vejo o XML?")).toBeInTheDocument(); // a pergunta fica
  });

  it("histórico: lista por dia, busca e abre a conversa arquivada", async () => {
    routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": () =>
        json({
          data: [
            session({ id: "a", day: "2026-09-01", app: "easycommandpay", messages: [{ role: "user", content: "Como cancelo a nota?" }] }),
            session({ id: "b", day: "2026-08-15", messages: [{ role: "user", content: "Totem offline" }] }),
          ],
        }),
    });
    renderPanel();
    await userEvent.click(await screen.findByText(/Ver 2 conversas anteriores/));
    expect(screen.getByText("2 conversas arquivadas")).toBeInTheDocument();
    expect(screen.getByText("EasyFoodManager")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "totem");
    expect(screen.queryByText("Como cancelo a nota?")).toBeNull();
    await userEvent.click(screen.getByText("Totem"));
    expect(screen.getByText("Conversa arquivada • somente leitura")).toBeInTheDocument();
    expect(screen.getByText("Totem offline")).toBeInTheDocument();
  });

  it("apagar um dia do histórico chama DELETE /ai/sessions/:id", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleted: string[] = [];
    routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": () => json({ data: [session({ id: "a", day: "2026-09-01", messages: [{ role: "user", content: "x" }] })] }),
      "DELETE /api/v1/ai/sessions/a": () => {
        deleted.push("a");
        return json({ data: { deleted: 1 } });
      },
    });
    renderPanel();
    await userEvent.click(await screen.findByText(/Ver 1 conversa anterior/));
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(deleted).toEqual(["a"]));
    expect(screen.getByText("Nenhuma conversa anterior")).toBeInTheDocument();
  });
});

describe("I4 — cache local e troca de tenant", () => {
  const scopedKey = (user: string, company: string, store: string) => `easycommandpay:ai-chat:history:${user}:${company}:${store}`;
  const puts = (fetchSpy: ReturnType<typeof routeFetch>) =>
    fetchSpy.mock.calls
      .filter(([input, init]) => String(input).startsWith("/api/v1/ai/sessions/today") && init?.method === "PUT")
      .map(([, init]) => ({ store: new Headers(init!.headers).get("x-store-id"), body: JSON.parse(String(init!.body)) as { messages: { content: string }[] } }));
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  afterEach(() => {
    tenantState.selection = { companyId: "c1", storeId: "s1" };
  });

  it("montagem com cache velho e servidor com conversa mais nova: mostra a do servidor e NÃO grava nada", async () => {
    const velho = [{ role: "user", content: "conversa velha deste PC", ts: 1 }];
    localStorage.setItem(scopedKey("u1", "c1", "s1"), JSON.stringify(velho));
    localStorage.setItem("easycommandpay:ai-chat:history", JSON.stringify(velho)); // chave antiga, sem dono
    localStorage.setItem("easycommandpay:ai-chat:day", today());
    const fetchSpy = routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": () => json({ data: [session({ messages: [{ role: "user", content: "feita no outro dispositivo" }] })] }),
    });
    renderPanel();
    expect(await screen.findByText("feita no outro dispositivo")).toBeInTheDocument();
    await settle();
    expect(screen.queryByText("conversa velha deste PC")).toBeNull();
    expect(puts(fetchSpy)).toEqual([]);
  });

  it("nada vai ao servidor antes de a lista do tenant carregar", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    localStorage.setItem("easycommandpay:ai-chat:history", JSON.stringify([{ role: "user", content: "cache antigo", ts: 1 }]));
    const fetchSpy = routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": async () => {
        await gate;
        return json({ data: [] });
      },
    });
    renderPanel();
    await settle();
    expect(puts(fetchSpy)).toEqual([]);
    release();
    await settle();
    expect(puts(fetchSpy)).toEqual([]);
    expect(screen.queryByText("cache antigo")).toBeNull();
  });

  it("cache de outro usuário ou de outra loja no mesmo PC não aparece nem é gravado como meu", async () => {
    localStorage.setItem("easycommandpay:ai-chat:day", today());
    localStorage.setItem("easycommandpay:ai-chat:day:u2:c1:s1", today());
    localStorage.setItem(scopedKey("u2", "c1", "s1"), JSON.stringify([{ role: "user", content: "do usuário B", ts: 1 }]));
    localStorage.setItem("easycommandpay:ai-chat:day:u1:c1:s2", today());
    localStorage.setItem(scopedKey("u1", "c1", "s2"), JSON.stringify([{ role: "user", content: "da outra loja", ts: 1 }]));
    const fetchSpy = routeFetch({ ...baseRoutes, "GET /api/v1/ai/sessions": () => json({ data: [] }) });
    renderPanel();
    await settle();
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeInTheDocument();
    expect(screen.queryByText("do usuário B")).toBeNull();
    expect(screen.queryByText("da outra loja")).toBeNull();
    expect(puts(fetchSpy)).toEqual([]);
  });

  it("o cache é gravado com dono: usuário + empresa + loja", async () => {
    routeFetch({ ...baseRoutes, "GET /api/v1/ai/sessions": () => json({ data: [session({ messages: [{ role: "user", content: "minha" }] })] }) });
    renderPanel();
    await screen.findByText("minha");
    await waitFor(() => expect(localStorage.getItem(scopedKey("u1", "c1", "s1"))).toContain("minha"));
    expect(localStorage.getItem("easycommandpay:ai-chat:history")).toBeNull();
  });

  it("troca de loja: a conversa da loja anterior some e NÃO é regravada na loja nova", async () => {
    const fetchSpy = routeFetch({
      ...baseRoutes,
      "GET /api/v1/ai/sessions": (init) =>
        new Headers(init.headers).get("x-store-id") === "s1"
          ? json({ data: [session({ messages: [{ role: "user", content: "conversa da loja 1" }] })] })
          : json({ data: [] }),
    });
    const view = renderPanel();
    expect(await screen.findByText("conversa da loja 1")).toBeInTheDocument();
    tenantState.selection = { companyId: "c1", storeId: "s2" };
    view.rerender(<AIChatPanel open onClose={vi.fn()} />);
    await settle();
    expect(screen.queryByText("conversa da loja 1")).toBeNull();
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeInTheDocument();
    expect(puts(fetchSpy).filter((p) => p.store === "s2")).toEqual([]);
  });
});

describe("AIChatButton", () => {
  it("abre o painel ao clicar e fecha pelo X", async () => {
    routeFetch({ ...baseRoutes, "GET /api/v1/ai/sessions": () => json({ data: [] }) });
    render(<AIChatButton />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Abrir Assistente IA" }));
    const heading = screen.getByRole("heading", { name: "Assistente IA" });
    expect(heading).toBeInTheDocument();
    const header = heading.closest("div.relative") as HTMLElement;
    const buttons = within(header).getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1] as HTMLElement);
    expect(screen.getByRole("button", { name: "Abrir Assistente IA" })).toBeInTheDocument();
  });
});
