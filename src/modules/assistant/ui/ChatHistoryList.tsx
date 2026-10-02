"use client";

import { useMemo } from "react";
import { History, Search, Trash2, X } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import type { ChatHistoryEntry } from "../domain/chat";
import {
  appLabel,
  findFirstMatch,
  formatDateLabel,
  groupHistoryByDate,
  matchesAll,
  parseSearch,
  type SearchTerm,
} from "../domain/history";

function highlightMatch(text: string, terms: SearchTerm[]) {
  if (terms.length === 0) return text;
  const range = findFirstMatch(text, terms);
  if (!range) return text;
  const start = Math.max(0, range.start - 30);
  const prefix = start > 0 ? "…" : "";
  const visible = text.slice(start);
  const localStart = range.start - start;
  const localEnd = range.end - start;
  return (
    <>
      {prefix}
      {visible.slice(0, localStart)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{visible.slice(localStart, localEnd)}</mark>
      {visible.slice(localEnd)}
    </>
  );
}

interface Props {
  history: ChatHistoryEntry[];
  search: string;
  onSearchChange(value: string): void;
  onOpenDay(entry: ChatHistoryEntry): void;
  onDeleteEntry(id: string): void;
}

/** Conversas arquivadas, agrupadas por dia, com busca (`"frase exata"` ou `pedido*`). */
export function ChatHistoryList({ history, search, onSearchChange, onOpenDay, onDeleteEntry }: Props) {
  const searchTerms = useMemo(() => parseSearch(search), [search]);

  const historyByDate = useMemo(() => {
    const filtered =
      searchTerms.length === 0
        ? history
        : history.filter((entry) => {
            const haystack = `${formatDateLabel(entry.date)} ${entry.date} ${entry.messages.map((m) => m.content).join(" \n ")}`;
            return matchesAll(haystack, searchTerms);
          });
    return groupHistoryByDate(filtered);
  }, [history, searchTerms]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {history.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Buscar:  "frase exata"  ou  pedido*'
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-3 ai-scroll">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhuma conversa anterior</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Suas conversas serão arquivadas automaticamente ao virar o dia.
              </p>
            </div>
          </div>
        ) : historyByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Nenhum resultado para “{search}”</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {historyByDate.map(([date, entries]) => {
              const allMessages = entries.flatMap((e) => e.messages);
              const dayEntry: ChatHistoryEntry = {
                id: `day-${date}`,
                date,
                startedAt: Math.min(...entries.map((e) => e.startedAt)),
                endedAt: Math.max(...entries.map((e) => e.endedAt)),
                messages: allMessages,
              };
              const firstUser = allMessages.find((m) => m.role === "user");
              const matched = searchTerms.length > 0 ? allMessages.find((m) => matchesAll(m.content, searchTerms)) : null;
              const preview = (matched ?? firstUser)?.content ?? "(sem mensagens)";
              const apps = Array.from(new Set(entries.map((e) => e.app ?? "").filter(Boolean)));
              return (
                <div
                  key={date}
                  className="group relative rounded-lg border border-border/60 bg-card hover:bg-accent hover:border-primary/30 transition-all"
                >
                  <button onClick={() => onOpenDay(dayEntry)} className="w-full text-left px-3 py-2.5 pr-9">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">{formatDateLabel(date)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">{allMessages.length} msg</span>
                    </div>
                    {apps.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {apps.map((a) => (
                          <span
                            key={a}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9.5px] font-medium leading-none"
                          >
                            {appLabel(a)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{highlightMatch(preview, searchTerms)}</p>
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Apagar histórico de ${formatDateLabel(date)}?`)) {
                            entries.forEach((entry) => onDeleteEntry(entry.id));
                          }
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        aria-label="Apagar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Apagar dia</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
