import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  CHAT_UNAVAILABLE_MESSAGE,
  chatErrorMessage,
  deltaOf,
  sessionToEntry,
  splitSessions,
  todayKey,
  type ChatSession,
} from "./chat";

const session = (over: Partial<ChatSession>): ChatSession => ({
  id: "x",
  userId: "u1",
  day: "2026-09-30",
  app: APP_NAME,
  messages: [],
  startedAt: "2026-09-30T10:00:00.000Z",
  endedAt: "2026-09-30T11:00:00.000Z",
  ...over,
});

describe("todayKey", () => {
  it("usa a data LOCAL no formato AAAA-MM-DD", () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("splitSessions", () => {
  it("a conversa de hoje é do próprio usuário, do dia e deste app", () => {
    const mine = session({ id: "a" });
    const colleague = session({ id: "b", userId: "u2" });
    const otherApp = session({ id: "c", app: "easyml" });
    const older = session({ id: "d", day: "2026-09-29" });
    const { today, history } = splitSessions([colleague, otherApp, mine, older], "u1", "2026-09-30");
    expect(today?.id).toBe("a");
    expect(history.map((s) => s.id)).toEqual(["b", "c", "d"]);
  });

  it("sem conversa de hoje, tudo vai para o histórico", () => {
    const { today, history } = splitSessions([session({ userId: "u2" })], "u1", "2026-09-30");
    expect(today).toBeNull();
    expect(history).toHaveLength(1);
  });
});

describe("sessionToEntry", () => {
  it("converte as datas em milissegundos", () => {
    const entry = sessionToEntry(session({ id: "a", messages: [{ role: "user", content: "oi" }] }));
    expect(entry).toEqual({
      id: "a",
      date: "2026-09-30",
      startedAt: Date.parse("2026-09-30T10:00:00.000Z"),
      endedAt: Date.parse("2026-09-30T11:00:00.000Z"),
      messages: [{ role: "user", content: "oi" }],
      app: APP_NAME,
    });
  });
});

describe("deltaOf (linha SSE no formato OpenAI)", () => {
  it("extrai o texto do delta", () => {
    expect(deltaOf('data: {"choices":[{"delta":{"content":"Olá"}}]}')).toBe("Olá");
  });
  it("ignora comentários, linhas vazias, [DONE] e linhas que não são data", () => {
    expect(deltaOf(": keep-alive")).toBeNull();
    expect(deltaOf("")).toBeNull();
    expect(deltaOf("data: [DONE]")).toBeNull();
    expect(deltaOf("event: ping")).toBeNull();
  });
  it("JSON partido não lança: devolve null", () => {
    expect(deltaOf('data: {"choices":[{"del')).toBeNull();
  });
  it("delta sem conteúdo devolve null", () => {
    expect(deltaOf('data: {"choices":[{"delta":{}}]}')).toBeNull();
  });
});

describe("chatErrorMessage (textos do legado, cloud-api-ai.ts)", () => {
  it("402, 429 e 401 têm texto próprio", () => {
    expect(chatErrorMessage(402, { message: "x" })).toBe("Créditos insuficientes. Acesse Créditos IA.");
    expect(chatErrorMessage(429, null)).toBe("Muitas requisições. Aguarde alguns segundos.");
    expect(chatErrorMessage(401, null)).toBe("Sessão expirada. Entre novamente.");
  });
  it("demais: a `message` do servidor, ou o texto padrão", () => {
    expect(chatErrorMessage(500, { message: "EasyAI fora do ar" })).toBe("EasyAI fora do ar");
    expect(chatErrorMessage(500, { error: "ai_upstream_error" })).toBe(CHAT_UNAVAILABLE_MESSAGE);
    expect(CHAT_UNAVAILABLE_MESSAGE).toBe("Não foi possível falar com o assistente agora.");
  });
});
