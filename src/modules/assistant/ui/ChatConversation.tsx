"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { History, Send, Sparkles, Square } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import type { ChatMessage } from "../domain/chat";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  historyCount: number;
  suggestions: string[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** O rascunho mora no painel: ir ao histórico e voltar não o apaga (como no legado). */
  input: string;
  onInputChange(value: string): void;
  onSend(text: string): void;
  onStop(): void;
  onOpenHistory(): void;
  onClose(): void;
}

/** A conversa do dia: mensagens, sugestões da página e a caixa de envio. */
export function ChatConversation({
  messages, isStreaming, historyCount, suggestions, textareaRef, input, onInputChange, onSend, onStop, onOpenHistory, onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input, textareaRef]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input);
    onInputChange("");
    stickToBottomRef.current = true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastIsAssistant = messages[messages.length - 1]?.role === "assistant";
  const showStreamPlaceholder = isStreaming && !lastIsAssistant;

  return (
    <>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth ai-scroll">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Olá! Como posso ajudar?</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Tire dúvidas sobre o sistema ou peça ajuda com tarefas.
              </p>
            </div>
            <div className="w-full space-y-1.5 mt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                Sugestões para esta página
              </p>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-accent hover:border-primary/30 text-foreground transition-all duration-150 hover:shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            {historyCount > 0 && (
              <button
                onClick={onOpenHistory}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mt-2"
              >
                <History className="h-3 w-3" />
                Ver {historyCount} conversa{historyCount !== 1 ? "s" : ""} anterior{historyCount !== 1 ? "es" : ""}
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onNavigate={onClose} />
        ))}

        {showStreamPlaceholder && <MessageBubble msg={{ role: "assistant", content: "" }} onNavigate={onClose} />}
      </div>

      <div className="border-t border-border p-3 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo… (Enter envia, Shift+Enter quebra linha)"
              className="min-h-[44px] max-h-[120px] resize-none text-base sm:text-sm py-2.5 pr-2 leading-snug ai-scroll ai-scroll-thin"
              rows={1}
              disabled={isStreaming}
            />
          </div>
          {isStreaming ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={onStop}>
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Parar geração</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 transition-transform hover:scale-105"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
          As respostas podem conter imprecisões. Verifique informações importantes.
        </p>
      </div>
    </>
  );
}
