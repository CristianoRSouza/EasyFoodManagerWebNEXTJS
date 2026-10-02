"use client";

/**
 * Card de "últimos eventos" (lista expansível com scroll infinito) do `SyncEventsPanel` legado
 * (JSX/classes/textos idênticos). O `IntersectionObserver` do sentinela é o mesmo do legado.
 */
import { useEffect, useRef } from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { SyncRecentEventRow } from "./SyncRecentEventRow";
import type { PanelRecentEvent } from "./sync-events-types";

export interface SyncRecentEventsCardProps {
  recentTitle: string;
  successStatusKey: string;
  events: PanelRecentEvent[];
  expanded: ReadonlySet<string>;
  onToggle: (eventId: string) => void;
  loadingMore: boolean;
  hasMore: boolean;
  /** Deve ter identidade estável (o observador do sentinela se reinscreve quando ela muda). */
  onLoadMore: () => void | Promise<void>;
  onRequeue?: (eventId: string) => void;
  requeueingId: string | null;
}

export function SyncRecentEventsCard({
  recentTitle,
  successStatusKey,
  events,
  expanded,
  onToggle,
  loadingMore,
  hasMore,
  onLoadMore,
  onRequeue,
  requeueingId,
}: SyncRecentEventsCardProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void onLoadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore]);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          {recentTitle}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({events.length} carregados)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {events.length === 0 && !loadingMore && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum evento registrado</p>
          )}
          {events.map((r) => (
            <SyncRecentEventRow
              key={r.event_id}
              event={r}
              successStatusKey={successStatusKey}
              isOpen={expanded.has(r.event_id)}
              onToggle={() => onToggle(r.event_id)}
              onRequeue={onRequeue}
              requeueing={requeueingId === r.event_id}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="py-4 text-center">
          {loadingMore && (
            <span className="text-xs text-muted-foreground animate-pulse">Carregando mais...</span>
          )}
          {!loadingMore && !hasMore && events.length > 0 && (
            <span className="text-xs text-muted-foreground">Fim da lista</span>
          )}
          {!loadingMore && hasMore && events.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void onLoadMore()}>
              Carregar mais
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
