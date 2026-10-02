"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { toast } from "@/shared/ui/primitives/sonner";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { AssistantRepository } from "../application/assistant-repository";
import { sessionToEntry, splitSessions, todayKey, type ChatHistoryEntry, type ChatMessage } from "../domain/chat";
import {
  cacheHistory,
  cacheMessages,
  clearCachedHistory,
  loadCachedMessages,
  readCachedDay,
  writeCachedDay,
  type ChatScope,
} from "./chat-storage";

const DAY_CHECK_INTERVAL_MS = 60_000;

const sameMessages = (a: ChatMessage[], b: ChatMessage[] | null) => b !== null && JSON.stringify(a) === JSON.stringify(b);

/**
 * Persistência das conversas no servidor (`/ai/sessions`): carrega e separa "hoje" do histórico,
 * grava a conversa do dia, apaga entradas e acompanha a virada do dia. Comportamento do
 * `useAIChat` do legado no modo nuvem, com três correções (revisão da Fase 5, I4):
 *
 * - **Nada é gravado antes de a lista do tenant ATUAL chegar.** No legado o efeito de gravação
 *   disparava na montagem com o cache local e sobrescrevia no servidor uma conversa mais nova,
 *   feita em outro dispositivo. Se a carga falhar, também não grava (o estado do servidor é
 *   desconhecido); a conversa fica só na tela.
 * - **A conversa recém-carregada não é regravada** (gravação só quando as mensagens mudam).
 * - **Troca de empresa/loja** zera a conversa e ignora respostas atrasadas do tenant anterior —
 *   o legado reenviava as mensagens da loja anterior como "hoje" da loja nova.
 */
export function useChatSessions(
  repo: AssistantRepository,
  tenant: Tenant,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setHistory: Dispatch<SetStateAction<ChatHistoryEntry[]>>,
) {
  const todaySessionIdRef = useRef<string | null>(null);
  /** Repositório cuja carga terminou — só com ele igual ao atual a gravação é liberada. */
  const loadedRepoRef = useRef<AssistantRepository | null>(null);
  /** Dono do cache (usuário + empresa + loja); `null` enquanto o servidor não disse quem é. */
  const scopeRef = useRef<ChatScope | null>(null);
  /** O que o servidor já tem — gravar de novo o mesmo conteúdo é só ruído. */
  const lastSyncedRef = useRef<ChatMessage[] | null>(null);
  /** Cada carga tem um número; resposta de carga antiga (outro tenant) é descartada. */
  const generationRef = useRef(0);

  const loadSessions = useCallback(async () => {
    const generation = ++generationRef.current;
    loadedRepoRef.current = null;
    try {
      // Quem sou eu vem do servidor. Precisa ser o id REAL: a lista é da empresa inteira, e sem
      // ele a conversa "de hoje" de um colega seria carregada como se fosse a minha.
      const [userId, sessions] = await Promise.all([repo.currentUserId(), repo.sessions()]);
      if (generation !== generationRef.current || !userId) return;

      const scope: ChatScope = { userId, companyId: tenant.companyId, storeId: tenant.storeId };
      scopeRef.current = scope;
      const today = todayKey();
      const { today: todaySession, history } = splitSessions(sessions, userId, today);
      if (todaySession) {
        todaySessionIdRef.current = todaySession.id;
        lastSyncedRef.current = todaySession.messages;
        setMessages(todaySession.messages);
        cacheMessages(scope, todaySession.messages);
      } else {
        todaySessionIdRef.current = null;
        lastSyncedRef.current = null;
        // Sem conversa de hoje no servidor: vale o que ESTE usuário tinha hoje nesta loja e não
        // chegou a gravar (o legado mantinha o cache do dia). O que já foi digitado durante a
        // carga tem precedência.
        const cached = readCachedDay(scope) === today ? loadCachedMessages(scope) : [];
        if (cached.length === 0) cacheMessages(scope, []);
        setMessages((current) => (current.length > 0 ? current : cached));
      }

      const entries = history.map(sessionToEntry);
      setHistory(entries);
      cacheHistory(scope, entries);
      writeCachedDay(scope, today);
      loadedRepoRef.current = repo;
    } catch (error) {
      console.warn("[useAIChat] load error:", error);
    }
  }, [repo, tenant, setMessages, setHistory]);

  useEffect(() => {
    todaySessionIdRef.current = null;
    lastSyncedRef.current = null;
    scopeRef.current = null;
    void loadSessions();
  }, [loadSessions]);

  const syncToday = useCallback(
    async (messages: ChatMessage[]) => {
      // Antes da carga do tenant atual o estado do servidor é desconhecido: gravar agora
      // sobrescreveria uma conversa mais nova (ou mandaria a de outro tenant).
      if (loadedRepoRef.current !== repo) return;
      const scope = scopeRef.current;
      if (scope) cacheMessages(scope, messages);
      if (sameMessages(messages, lastSyncedRef.current)) return;
      // ⚠️ Lista vazia APAGA a linha do dia. Só apaga o que sabemos existir.
      if (messages.length === 0 && !todaySessionIdRef.current) return;
      const generation = generationRef.current;
      try {
        const first = messages[0]?.ts;
        const last = messages[messages.length - 1]?.ts;
        const now = new Date().toISOString();
        lastSyncedRef.current = messages;
        const id = await repo.saveToday(
          messages,
          first ? new Date(first).toISOString() : now,
          last ? new Date(last).toISOString() : now,
        );
        if (generation === generationRef.current) todaySessionIdRef.current = id;
      } catch (error) {
        lastSyncedRef.current = null;
        console.warn("[useAIChat] sync error:", error);
      }
    },
    [repo],
  );

  // Virada do dia: a conversa de ontem vai para o histórico.
  useEffect(() => {
    const check = () => {
      const scope = scopeRef.current;
      if (!scope) return;
      const stored = readCachedDay(scope);
      const today = todayKey();
      if (stored && stored !== today) {
        // Atualiza já, para não disparar de novo caso a recarga falhe.
        writeCachedDay(scope, today);
        toast.info("Conversa do dia anterior movida para o histórico");
        void loadSessions();
      }
    };
    const interval = window.setInterval(check, DAY_CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadSessions]);

  const deleteHistoryEntry = useCallback(
    async (id: string) => {
      setHistory((prev) => {
        const next = prev.filter((e) => e.id !== id);
        if (scopeRef.current) cacheHistory(scopeRef.current, next);
        return next;
      });
      // Ids locais (`day-...`) nunca existiram no servidor.
      if (!id || id.startsWith("day-")) return;
      await repo.deleteSession(id).catch((error: unknown) => console.warn("[useAIChat] delete entry failed:", error));
    },
    [repo, setHistory],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    if (scopeRef.current) clearCachedHistory(scopeRef.current);
    await repo.clearHistory().catch((error: unknown) => console.warn("[useAIChat] clear history failed:", error));
  }, [repo, setHistory]);

  return { loadSessions, syncToday, deleteHistoryEntry, clearHistory };
}
