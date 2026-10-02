"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Loader2 } from "lucide-react";
import { useRuntime } from "@/shared/runtime/runtime-context";

/**
 * Sequential queue — no backend "lan" (Admin API local/LAN, equivalente ao antigo modo
 * Electron do legado), garante que apenas UM fetch roda por vez para evitar congelamento
 * (tela preta) do renderer quando várias seções competem pelo mesmo túnel local.
 *
 * Em backend "cloud" (HTTP/Supabase) os fetches são executados em PARALELO, já que o
 * gargalo do IPC local não existe e a latência de rede é dominante.
 *
 * MUDANÇA vs legado: o legado decidia isso no carregamento do módulo com
 * `isCloudSupabaseMode()` (checagem de `window.electronAPI`/hostname). Aqui não há
 * Electron nem `window` no bundle do servidor, então a decisão vira um parâmetro
 * (`parallel`) resolvido em runtime, dentro do componente, via `useRuntime().backend`.
 */
const queue: Array<() => Promise<void>> = [];
let running = false;

async function enqueue(parallel: boolean, fn: () => Promise<void>) {
  // backend "cloud": dispara em paralelo para minimizar latência total da página.
  if (parallel) {
    return fn();
  }
  return new Promise<void>((resolve, reject) => {
    queue.push(async () => {
      try {
        await fn();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const next = queue.shift()!;
    try {
      await next();
    } catch {
      // error handled inside enqueue
    }
    // yield to renderer between fetches (apenas backend "lan")
    await new Promise((r) => setTimeout(r, 16));
  }
  running = false;
}

interface LazyFiscalCardProps {
  icon: ReactNode;
  title: string;
  /** Called once when the card scrolls into view. Must return the fetched data. */
  fetchData: () => Promise<void>;
  children: ReactNode;
  /** If true, skip lazy and render immediately */
  eager?: boolean;
  /** Optional badge shown next to title (e.g. year filter) */
  titleBadge?: ReactNode;
}

export function LazyFiscalCard({ icon, title, fetchData, children, eager, titleBadge }: LazyFiscalCardProps) {
  const { backend } = useRuntime();
  const parallel = backend === "cloud";
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(eager ? "loading" : "idle");
  const triggered = useRef(false);

  const doFetch = async () => {
    if (triggered.current) return;
    triggered.current = true;
    setState("loading");
    try {
      await enqueue(parallel, async () => {
        await fetchData();
      });
      setState("done");
    } catch (err) {
      console.error(`[LazyFiscalCard] Falha ao carregar "${title}":`, err);
      setState("error");
    }
  };

  useEffect(() => {
    if (eager) {
      doFetch();
      return;
    }

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !triggered.current) {
          doFetch();
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }, // Pré-carrega cards que estão até 400px abaixo do viewport.
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager]);

  return (
    <div ref={sentinelRef}>
      <Card className="glass-panel">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
            {icon}
            <span className="break-words">{title}</span>
            {titleBadge}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {state === "idle" && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Role para baixo para carregar…
            </p>
          )}
          {state === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Carregando {title}…</span>
            </div>
          )}
          {state === "error" && (
            <p className="py-6 text-center text-sm text-destructive">
              Falha ao carregar. Atualize a página para tentar novamente.
            </p>
          )}
          {state === "done" && children}
        </CardContent>
      </Card>
    </div>
  );
}
