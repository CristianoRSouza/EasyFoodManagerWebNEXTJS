"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

/** Abaixo disso a lista inteira é renderizada; acima, revela em lotes ao rolar perto do fim. */
const WINDOW_THRESHOLD = 200;
const PAGE_SIZE = 50;
const SENTINEL_MARGIN_PX = 420;

/** `AppLayout` rola dentro de um `<main>` interno, não na `window` — encontra esse ancestral. */
function nearestScrollRoot(el: Element | null): Element | undefined {
  if (typeof window === "undefined" || typeof document === "undefined" || !el) return undefined;
  let cur: Element | null = el.parentElement;
  while (cur && cur !== document.documentElement) {
    const overflowY = window.getComputedStyle(cur).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      cur.scrollHeight > cur.clientHeight + 1
    ) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return undefined;
}

function sentinelNearRoot(target: HTMLElement, scrollRoot: Element | null, marginPx: number): boolean {
  if (!scrollRoot) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight ?? 0;
    return rect.top < viewportHeight + marginPx && rect.bottom > -marginPx;
  }
  const rootRect = scrollRoot.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  return rect.bottom > rootRect.top - marginPx && rect.top < rootRect.bottom + marginPx;
}

export interface InfiniteReveal<T> {
  visibleRows: T[];
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

/**
 * Scroll infinito client-side: abaixo de `WINDOW_THRESHOLD` linhas renderiza tudo de uma vez
 * (evita observer/sentinel para listas pequenas); acima disso, revela em lotes de
 * `PAGE_SIZE` conforme a rolagem se aproxima do fim da lista já visível.
 *
 * `resetKey` volta a exibição para a primeira página (ex.: quando os filtros ou o período
 * mudam). O ajuste acontece durante a renderização (padrão recomendado pelo React para
 * "resetar estado quando uma prop muda"), não num efeito — `react-hooks/set-state-in-effect`
 * rejeita `setState` síncrono dentro do corpo de um efeito.
 */
export function useInfiniteReveal<T>(rows: T[], resetKey: unknown): InfiniteReveal<T> {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [trackedResetKey, setTrackedResetKey] = useState(resetKey);
  if (trackedResetKey !== resetKey) {
    setTrackedResetKey(resetKey);
    setVisibleCount(PAGE_SIZE);
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldVirtualize = rows.length > WINDOW_THRESHOLD;
  // Não persiste o clamp em estado — `rows.length` pode encolher (novo período/filtro) sem
  // que `visibleCount` precise de um efeito só para acompanhar.
  const effectiveVisibleCount = shouldVirtualize ? Math.min(visibleCount, rows.length) : rows.length;
  const visibleRows = useMemo(
    () => (shouldVirtualize ? rows.slice(0, effectiveVisibleCount) : rows),
    [rows, effectiveVisibleCount, shouldVirtualize],
  );
  const hasMore = shouldVirtualize && effectiveVisibleCount < rows.length;

  useEffect(() => {
    if (!shouldVirtualize || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const scrollRoot = nearestScrollRoot(el) ?? null;

    const tryPump = () => {
      const target = sentinelRef.current;
      if (!target) return;
      if (!sentinelNearRoot(target, scrollRoot, SENTINEL_MARGIN_PX)) return;
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, rows.length));
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) tryPump();
      },
      { root: scrollRoot, rootMargin: `${SENTINEL_MARGIN_PX}px 0px`, threshold: 0 },
    );
    io.observe(el);
    scrollRoot?.addEventListener("scroll", tryPump, { passive: true });
    window.addEventListener("resize", tryPump, { passive: true });
    const raf = requestAnimationFrame(tryPump);

    return () => {
      io.disconnect();
      scrollRoot?.removeEventListener("scroll", tryPump);
      window.removeEventListener("resize", tryPump);
      cancelAnimationFrame(raf);
    };
  }, [shouldVirtualize, hasMore, rows.length]);

  return { visibleRows, hasMore, sentinelRef };
}
