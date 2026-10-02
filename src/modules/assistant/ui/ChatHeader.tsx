"use client";

import { ArrowLeft, History, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";

export type ChatView = "chat" | "history" | "history-detail";

interface Props {
  view: ChatView;
  title: string;
  subtitle: string;
  isStreaming: boolean;
  historyCount: number;
  onBack(): void;
  onOpenHistory(): void;
  onClearHistory(): void;
  onClose(): void;
}

export function ChatHeader({ view, title, subtitle, isStreaming, historyCount, onBack, onOpenHistory, onClearHistory, onClose }: Props) {
  return (
    <div className="relative flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-br from-primary/5 via-card to-card">
      <div className="flex items-center gap-2.5 min-w-0">
        {view !== "chat" ? (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
            {isStreaming && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background animate-pulse" />
            )}
          </div>
        )}
        <div className="leading-tight min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {view === "chat" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7 relative" onClick={onOpenHistory}>
                <History className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                {historyCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
                    {historyCount > 9 ? "9+" : historyCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Histórico</TooltipContent>
          </Tooltip>
        )}
        {view === "history" && historyCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={onClearHistory}>
                <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Apagar tudo</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={onClose}>
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Fechar (Esc)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
