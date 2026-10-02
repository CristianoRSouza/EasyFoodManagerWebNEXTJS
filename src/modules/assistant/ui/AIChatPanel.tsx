"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "@/shared/ui/primitives/sonner";
import type { ChatHistoryEntry } from "../domain/chat";
import { formatDateLabel, suggestionsFor } from "../domain/history";
import { ChatConversation } from "./ChatConversation";
import { ChatHeader, type ChatView } from "./ChatHeader";
import { ChatHistoryList } from "./ChatHistoryList";
import { MessageBubble } from "./MessageBubble";
import { useAIChat } from "./use-ai-chat";
import { useAICredits } from "./use-ai-credits";

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

function subtitleFor(
  view: ChatView,
  credits: { freeRemaining: number; balance: number },
  historyCount: number,
  selectedEntry: ChatHistoryEntry | null,
): string {
  if (view === "chat") {
    const { freeRemaining, balance } = credits;
    if (freeRemaining > 0) return `${freeRemaining} consulta${freeRemaining !== 1 ? "s" : ""} grátis hoje`;
    if (balance > 0) return `${balance} crédito${balance !== 1 ? "s" : ""} disponíveis`;
    return "Sem créditos — acesse Créditos IA";
  }
  if (view === "history") {
    return `${historyCount} conversa${historyCount !== 1 ? "s" : ""} arquivada${historyCount !== 1 ? "s" : ""}`;
  }
  return selectedEntry ? `${formatDateLabel(selectedEntry.date)} • ${selectedEntry.messages.length} mensagens` : "";
}

/**
 * Painel do assistente — `LEGACY/src/components/ai-chat/AIChatPanel.tsx`. Os hooks rodam mesmo
 * com o painel fechado (o botão o mantém montado), como no legado: a conversa e os créditos já
 * estão carregados quando ele abre.
 */
export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const { messages, isStreaming, history, sendMessage, stopStreaming, deleteHistoryEntry, clearHistory } = useAIChat();
  const { freeRemaining, balance, refetchAll } = useAICredits();
  const pathname = usePathname();

  const [input, setInput] = useState("");
  const [view, setView] = useState<ChatView>("chat");
  const [selectedEntry, setSelectedEntry] = useState<ChatHistoryEntry | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Terminada uma resposta, o saldo/cota mudou: recarrega os créditos.
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      wasStreamingRef.current = false;
      const t = setTimeout(() => refetchAll(), 600);
      return () => clearTimeout(t);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, refetchAll]);

  useEffect(() => {
    if (open && view === "chat") {
      const t = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view !== "chat") setView(view === "history-detail" ? "history" : "chat");
        else onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, view]);

  const suggestions = useMemo(() => suggestionsFor(pathname ?? "/"), [pathname]);

  const handleClearHistory = () => {
    if (history.length === 0) return;
    if (confirm("Apagar todo o histórico de conversas?")) {
      void clearHistory();
      toast.success("Histórico apagado");
      setView("chat");
    }
  };

  if (!open) return null;

  const title = view === "chat" ? "Assistente IA" : view === "history" ? "Histórico" : "Conversa anterior";

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 z-50 flex flex-col w-full sm:w-[420px] h-[100dvh] sm:h-[min(640px,calc(100vh-2rem))] sm:rounded-2xl border-0 sm:border border-border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 pb-[env(safe-area-inset-bottom)]">
      <ChatHeader
        view={view}
        title={title}
        subtitle={subtitleFor(view, { freeRemaining, balance }, history.length, selectedEntry)}
        isStreaming={isStreaming}
        historyCount={history.length}
        onBack={() => setView(view === "history-detail" ? "history" : "chat")}
        onOpenHistory={() => setView("history")}
        onClearHistory={handleClearHistory}
        onClose={onClose}
      />

      {view === "chat" && (
        <ChatConversation
          messages={messages}
          isStreaming={isStreaming}
          historyCount={history.length}
          suggestions={suggestions}
          textareaRef={textareaRef}
          input={input}
          onInputChange={setInput}
          onSend={(text) => void sendMessage(text)}
          onStop={stopStreaming}
          onOpenHistory={() => setView("history")}
          onClose={onClose}
        />
      )}

      {view === "history" && (
        <ChatHistoryList
          history={history}
          search={historySearch}
          onSearchChange={setHistorySearch}
          onOpenDay={(entry) => {
            setSelectedEntry(entry);
            setView("history-detail");
          }}
          onDeleteEntry={(id) => void deleteHistoryEntry(id)}
        />
      )}

      {view === "history-detail" && selectedEntry && (
        <div className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth ai-scroll">
          {selectedEntry.messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onNavigate={onClose} />
          ))}
          <p className="text-[10px] text-muted-foreground/70 text-center mt-4 pb-2">Conversa arquivada • somente leitura</p>
        </div>
      )}
    </div>
  );
}
