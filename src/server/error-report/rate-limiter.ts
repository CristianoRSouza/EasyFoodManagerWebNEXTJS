import "server-only";

export type RateDecision = { ok: true } | { ok: false; retryAfterSec: number };

export interface RateLimiter {
  /** Registra um uso de `key`; recusado quando `key` já usou `limit` vezes na janela. */
  consume(key: string): RateDecision;
  /** Chaves em memória (para teste). */
  size(): number;
}

interface Options {
  limit: number;
  windowMs: number;
  now?: () => number;
  /** Teto de chaves guardadas — a memória não cresce com IPs/usuários sem fim. */
  maxKeys?: number;
}

/**
 * Limite de frequência em memória, janela deslizante por chave. Vale por processo do Next (a
 * instalação roda um só); reiniciar o servidor zera as contagens, o que é aceitável para um
 * anti-inundação. Recusa não conta como uso.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now, maxKeys = 10_000 }: Options): RateLimiter {
  const hits = new Map<string, number[]>();

  const prune = (at: number) => {
    for (const [key, times] of hits) {
      if (times[times.length - 1]! <= at - windowMs) hits.delete(key);
    }
    // Ainda cheio (inundação de chaves novas): descarta as mais antigas (ordem de inserção).
    for (const key of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(key);
    }
  };

  return {
    consume(key) {
      const at = now();
      const recent = (hits.get(key) ?? []).filter((t) => t > at - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0]! + windowMs - at) / 1000)) };
      }
      if (!hits.has(key) && hits.size >= maxKeys) prune(at);
      recent.push(at);
      hits.delete(key);
      hits.set(key, recent);
      return { ok: true };
    },
    size: () => hits.size,
  };
}
