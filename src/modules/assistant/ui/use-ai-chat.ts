"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/shared/ui/primitives/sonner";
import { ChatError, type ChatHistoryEntry, type ChatMessage } from "../domain/chat";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useAssistantRepository } from "./use-assistant-repository";
import { useChatSessions } from "./use-chat-sessions";
import { useStreamBuffer } from "./use-stream-buffer";

export type { ChatHistoryEntry, ChatMessage };

const isAbort = (error: unknown) =>
  (error instanceof DOMException && error.name === "AbortError") || (error as { name?: string } | null)?.name === "AbortError";

/**
 * O assistente do painel — `LEGACY/src/hooks/useAIChat.ts`, caminho da nuvem pela EasyFoodAPI.
 * A conversa do dia vive no chat e sincroniza ao fim de cada resposta; dias anteriores aparecem
 * no histórico; o `localStorage` é só cache otimista.
 */
export function useAIChat() {
  const tenant = useRequiredTenant();
  const repo = useAssistantRepository();
  // Começa vazio: o cache local tem dono (usuário + empresa + loja) e o usuário só se conhece
  // quando o servidor responde — `useChatSessions` preenche na carga.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const stream = useStreamBuffer(setMessages);
  const { syncToday, deleteHistoryEntry, clearHistory } = useChatSessions(repo, tenant, setMessages, setHistory);

  // Trocou a empresa/loja: a conversa da anterior sai da tela já neste render (antes de qualquer
  // efeito de gravação ver as mensagens velhas com o repositório novo).
  const [shownRepo, setShownRepo] = useState(repo);
  if (shownRepo !== repo) {
    setShownRepo(repo);
    setMessages([]);
    setHistory([]);
  }

  // Salva no cache e no servidor quando as mensagens mudam (fora do streaming). Quem decide se
  // já pode gravar é `syncToday` (só depois da carga do tenant atual).
  useEffect(() => {
    if (isStreaming) return;
    void syncToday(messages);
  }, [messages, isStreaming, syncToday]);

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const updated: ChatMessage[] = [...messages, { role: "user", content: trimmed, ts: Date.now() }];
      setMessages(updated);
      setIsStreaming(true);
      stream.reset();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await repo.ask(
          updated.map(({ role, content }) => ({ role, content })),
          stream.append,
          controller.signal,
        );
        stream.finish();
      } catch (error) {
        if (isAbort(error)) return;
        // O erro do chat já vem com texto pronto: 402 e 429 significam coisas diferentes.
        const message = error instanceof ChatError ? error.message : "Erro ao se comunicar com o assistente";
        console.error("AI chat error:", error);
        toast.error(message);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, repo, stream],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    stream.finish();
    setIsStreaming(false);
  }, [stream]);

  // `clearMessages`, `regenerateLast` e `refreshHistory` do legado não têm chamador no painel
  // (nem em nenhuma outra tela) e não foram trazidos.
  return {
    messages,
    isStreaming,
    history,
    sendMessage,
    stopStreaming,
    deleteHistoryEntry,
    clearHistory,
  };
}
