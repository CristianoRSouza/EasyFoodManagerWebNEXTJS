/**
 * O assistente de IA do painel (só nuvem, como no legado).
 *
 * As conversas ficam uma por usuário/dia: a de hoje fica aberta no chat; as anteriores (de
 * qualquer usuário da empresa e de qualquer app) viram histórico. Regras copiadas de
 * `LEGACY/src/hooks/useAIChat.ts` e `LEGACY/src/lib/cloud-api-ai.ts`.
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  error?: boolean;
}

/** Linha de `GET /v1/ai/sessions`, já convertida. */
export interface ChatSession {
  id: string;
  userId: string;
  /** `AAAA-MM-DD`. */
  day: string;
  app: string | null;
  messages: ChatMessage[];
  startedAt: string;
  endedAt: string;
}

/** Conversa arquivada, como o painel de histórico a exibe. */
export interface ChatHistoryEntry {
  id: string;
  date: string;
  startedAt: number;
  endedAt: number;
  messages: ChatMessage[];
  app?: string | null;
}

/** Como este painel se identifica nas conversas gravadas. */
export const APP_NAME = "easyfood-manager";

export const CHAT_UNAVAILABLE_MESSAGE = "Não foi possível falar com o assistente agora.";

export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * A conversa de hoje é a do próprio usuário, deste painel. A lista é da empresa inteira de
 * propósito, e sem o filtro de usuário a conversa de um colega abriria como se fosse minha.
 */
export function splitSessions(
  sessions: ChatSession[],
  userId: string,
  today: string,
): { today: ChatSession | null; history: ChatSession[] } {
  const todaySession = sessions.find((s) => s.day === today && s.userId === userId && s.app === APP_NAME) ?? null;
  return { today: todaySession, history: sessions.filter((s) => s.id !== todaySession?.id) };
}

export function sessionToEntry(session: ChatSession): ChatHistoryEntry {
  return {
    id: session.id,
    date: session.day,
    startedAt: new Date(session.startedAt).getTime(),
    endedAt: new Date(session.endedAt).getTime(),
    messages: session.messages,
    app: session.app ?? null,
  };
}

/**
 * O texto de uma linha do fluxo de resposta (SSE no formato da OpenAI). Linha incompleta,
 * comentário ou `[DONE]` devolvem `null` — o buffer só é consumido em `\n`, então o próximo
 * pedaço da rede completa a linha.
 */
export function deltaOf(line: string): string | null {
  if (line.startsWith(":") || line.trim() === "") return null;
  if (!line.startsWith("data: ")) return null;
  const json = line.slice(6).trim();
  if (json === "[DONE]") return null;
  try {
    const parsed = JSON.parse(json) as { choices?: { delta?: { content?: unknown } }[] };
    const content = parsed?.choices?.[0]?.delta?.content;
    return typeof content === "string" && content ? content : null;
  } catch {
    return null;
  }
}

/**
 * Mensagem pronta para o usuário. 402 e 429 significam coisas diferentes ("acabou o crédito" vs
 * "calma"); um texto genérico faria as duas parecerem defeito do sistema.
 */
export function chatErrorMessage(status: number, body: { message?: string; error?: string } | null): string {
  if (status === 429) return "Muitas requisições. Aguarde alguns segundos.";
  if (status === 402) return "Créditos insuficientes. Acesse Créditos IA.";
  if (status === 401) return "Sessão expirada. Entre novamente.";
  return body?.message || CHAT_UNAVAILABLE_MESSAGE;
}

/** Erro de chat com a mensagem já pronta para o usuário. */
export class ChatError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChatError";
  }
}
