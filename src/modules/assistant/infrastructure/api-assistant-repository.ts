import type { AssistantRepository } from "../application/assistant-repository";
import { CHAT_UNAVAILABLE_MESSAGE, ChatError, chatErrorMessage, type ChatMessage, type ChatSession } from "../domain/chat";
import type { UsageEntry } from "../domain/credits";
import { apiRequest, readBody } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import { asBoolean, asNumber, asText } from "@/shared/infrastructure/convert";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import { readSseDeltas } from "./sse-stream";

type Row = Record<string, unknown>;

/** Mesmo tamanho de extrato que o legado lê (`limit=200`). */
const STATEMENT_LIMIT = 200;

function toSession(row: Row): ChatSession {
  return {
    id: asText(row.id) ?? "",
    userId: asText(row.user_id) ?? "",
    day: asText(row.day) ?? "",
    app: asText(row.app),
    messages: Array.isArray(row.messages) ? (row.messages as ChatMessage[]) : [],
    startedAt: asText(row.started_at) ?? "",
    endedAt: asText(row.ended_at) ?? "",
  };
}

/**
 * O assistente pela EasyFoodAPI, através do repasse `/api/v1` do Next. Empresa e loja vão nos
 * cabeçalhos e são conferidas no servidor — o corpo do chat leva só as mensagens.
 */
export class ApiAssistantRepository implements AssistantRepository {
  constructor(private readonly tenant: Tenant) {}

  async currentUserId(): Promise<string | null> {
    const me = await apiRequest<{ id?: string }>("/auth/me").catch(() => null);
    return me?.id ?? null;
  }

  async sessions(): Promise<ChatSession[]> {
    const { data } = await apiRequest<Envelope<Row[] | null>>("/ai/sessions", { tenant: this.tenant });
    return (data ?? []).map(toSession);
  }

  async saveToday(messages: ChatMessage[], startedAt: string, endedAt: string): Promise<string | null> {
    const { data } = await apiRequest<Envelope<{ id?: string } | null>>("/ai/sessions/today", {
      method: "PUT",
      body: { messages, started_at: startedAt, ended_at: endedAt },
      tenant: this.tenant,
    });
    return data?.id ?? null;
  }

  async deleteSession(id: string): Promise<void> {
    await apiRequest(`/ai/sessions/${encodeURIComponent(id)}`, { method: "DELETE", tenant: this.tenant });
  }

  async clearHistory(): Promise<void> {
    await apiRequest("/ai/sessions", { method: "DELETE", tenant: this.tenant });
  }

  /**
   * Não passa pelo `apiRequest` de propósito: ele lê o corpo inteiro antes de devolver, o que
   * seguraria a resposta até a última palavra — o oposto de um chat que "digita" na tela.
   */
  async ask(
    messages: Pick<ChatMessage, "role" | "content">[],
    onDelta: (text: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const headers = new Headers({ "content-type": "application/json", accept: "text/event-stream" });
    headers.set("x-company-id", this.tenant.companyId);
    headers.set("x-store-id", this.tenant.storeId);

    let response: Response;
    try {
      response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ messages }),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ChatError(0, CHAT_UNAVAILABLE_MESSAGE);
    }

    if (!response.ok || !response.body) {
      const body = (await readBody(response)) as { message?: string; error?: string } | null;
      throw new ChatError(response.status, chatErrorMessage(response.status, body));
    }
    await readSseDeltas(response.body, onDelta);
  }

  async usage(): Promise<UsageEntry[]> {
    const { data } = await apiRequest<Envelope<Row[] | null>>(`/billing/usage?limit=${STATEMENT_LIMIT}`, {
      tenant: this.tenant,
    });
    return (data ?? []).map((row) => ({
      createdAt: asText(row.created_at) ?? "",
      wasFree: asBoolean(row.was_free),
      action: asText(row.action),
    }));
  }

  async creditAmounts(): Promise<number[]> {
    const { data } = await apiRequest<Envelope<Row[] | null>>(`/billing/credits?limit=${STATEMENT_LIMIT}`, {
      tenant: this.tenant,
    });
    return (data ?? []).map((row) => asNumber(row.amount));
  }
}
