// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limiter";

describe("createRateLimiter (janela deslizante em memória)", () => {
  it("libera até o limite por chave e recusa a próxima, com o tempo até liberar", () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, now: () => now });
    for (let i = 0; i < 5; i++) expect(limiter.consume("u1")).toEqual({ ok: true });
    now += 10_000;
    expect(limiter.consume("u1")).toEqual({ ok: false, retryAfterSec: 50 });
    expect(limiter.consume("u2")).toEqual({ ok: true });
  });

  it("a janela desliza: passado o tempo, volta a liberar", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    limiter.consume("k");
    now = 30_000;
    limiter.consume("k");
    expect(limiter.consume("k").ok).toBe(false);
    now = 60_001;
    expect(limiter.consume("k").ok).toBe(true);
    expect(limiter.consume("k").ok).toBe(false);
  });

  it("recusa não conta como uso (quem insiste não se tranca para sempre)", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.consume("k");
    for (let i = 0; i < 10; i++) limiter.consume("k");
    now = 1_001;
    expect(limiter.consume("k").ok).toBe(true);
  });

  it("memória limitada: chaves vencidas são descartadas e o total nunca passa do teto", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now, maxKeys: 3 });
    for (const key of ["a", "b", "c", "d", "e"]) limiter.consume(key);
    expect(limiter.size()).toBeLessThanOrEqual(3);
    now = 5_000;
    limiter.consume("f");
    expect(limiter.size()).toBe(1);
  });
});
