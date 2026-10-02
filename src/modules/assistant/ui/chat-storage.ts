import type { ChatHistoryEntry, ChatMessage } from "../domain/chat";

/**
 * Cache otimista do chat no `localStorage` — só para reabrir a conversa; a verdade é o servidor.
 *
 * Mesmos prefixos e limites do legado (`useAIChat.ts`), mas cada chave tem DONO: usuário, empresa
 * e loja (`:<userId>:<companyId>:<storeId>`). No legado as chaves eram únicas por navegador, e num
 * PC compartilhado a conversa de um usuário (ou de outra loja) virava a "de hoje" de outro. As
 * chaves antigas, sem dono, não são lidas.
 */
export const CHAT_STORAGE_KEYS = {
  messages: "easycommandpay:ai-chat:history",
  archive: "easycommandpay:ai-chat:archive",
  day: "easycommandpay:ai-chat:day",
} as const;

/** De quem é o cache: só se conhece depois de o servidor dizer quem é o usuário. */
export interface ChatScope {
  userId: string;
  companyId: string;
  storeId: string;
}

const MAX_PERSISTED = 60;
const MAX_HISTORY_ENTRIES = 30;

const keyOf = (base: string, scope: ChatScope) => `${base}:${scope.userId}:${scope.companyId}:${scope.storeId}`;

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* navegador sem armazenamento: segue sem cache */
  }
}

export const loadCachedMessages = (scope: ChatScope): ChatMessage[] =>
  readArray<ChatMessage>(keyOf(CHAT_STORAGE_KEYS.messages, scope)).slice(-MAX_PERSISTED);
export const cacheMessages = (scope: ChatScope, messages: ChatMessage[]) =>
  write(keyOf(CHAT_STORAGE_KEYS.messages, scope), JSON.stringify(messages.slice(-MAX_PERSISTED)));

export const cacheHistory = (scope: ChatScope, entries: ChatHistoryEntry[]) =>
  write(keyOf(CHAT_STORAGE_KEYS.archive, scope), JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
export const clearCachedHistory = (scope: ChatScope) => write(keyOf(CHAT_STORAGE_KEYS.archive, scope), null);

export function readCachedDay(scope: ChatScope): string | null {
  try {
    return localStorage.getItem(keyOf(CHAT_STORAGE_KEYS.day, scope));
  } catch {
    return null;
  }
}
export const writeCachedDay = (scope: ChatScope, day: string) => write(keyOf(CHAT_STORAGE_KEYS.day, scope), day);
