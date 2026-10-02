"use client";

import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { ChatMessage } from "../domain/chat";

/**
 * Junta os pedaços do SSE e redesenha no máximo uma vez por quadro (`requestAnimationFrame`),
 * como o legado: a cada flush, a última bolha do assistente recebe o texto acumulado (ou nasce,
 * se a última mensagem ainda é a do usuário).
 */
export function useStreamBuffer(setMessages: Dispatch<SetStateAction<ChatMessage[]>>) {
  const bufferRef = useRef("");
  const frameRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    frameRef.current = null;
    const text = bufferRef.current;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
      }
      return [...prev, { role: "assistant", content: text, ts: Date.now() }];
    });
  }, [setMessages]);

  const cancelScheduled = useCallback(() => {
    if (frameRef.current == null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const reset = useCallback(() => {
    bufferRef.current = "";
  }, []);

  const append = useCallback(
    (text: string) => {
      bufferRef.current += text;
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  /** Fim do fluxo (ou parada pelo usuário): desenha o que chegou, sem esperar o próximo quadro. */
  const finish = useCallback(() => {
    cancelScheduled();
    flush();
  }, [cancelScheduled, flush]);

  return { reset, append, finish };
}
