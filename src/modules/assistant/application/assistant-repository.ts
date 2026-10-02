import type { ChatMessage, ChatSession } from "../domain/chat";
import type { UsageEntry } from "../domain/credits";

/** O assistente pela EasyFoodAPI (rotas de `LEGACY/src/lib/cloud-api-ai.ts` e `cloud-api-billing.ts`). */
export interface AssistantRepository {
  /** Quem está usando (`/auth/me`) — a conversa de hoje é a deste usuário. */
  currentUserId(): Promise<string | null>;
  /** As conversas da empresa ativa (inclui a de hoje — quem separa é a tela). */
  sessions(): Promise<ChatSession[]>;
  /** Grava a conversa de hoje. **Lista vazia APAGA** a linha do dia. Devolve o id da linha. */
  saveToday(messages: ChatMessage[], startedAt: string, endedAt: string): Promise<string | null>;
  deleteSession(id: string): Promise<void>;
  /** Limpa o histórico do usuário, PRESERVANDO a conversa de hoje. */
  clearHistory(): Promise<void>;
  /** Pergunta ao assistente; o texto chega em pedaços, por `onDelta`. */
  ask(
    messages: Pick<ChatMessage, "role" | "content">[],
    onDelta: (text: string) => void,
    signal: AbortSignal,
  ): Promise<void>;
  /** Log de uso da loja ativa (últimos 200). */
  usage(): Promise<UsageEntry[]>;
  /** Valores do extrato de créditos da loja ativa (últimos 200); a soma é o saldo. */
  creditAmounts(): Promise<number[]>;
}
