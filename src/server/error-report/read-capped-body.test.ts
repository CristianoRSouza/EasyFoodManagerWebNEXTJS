// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readCappedText } from "./read-capped-body";

const encoder = new TextEncoder();

/** Fluxo "chunked" sem fim: entrega pedaços de `size` bytes enquanto alguém ler. */
function endlessStream(size: number) {
  const cancel = vi.fn();
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += size;
      controller.enqueue(new Uint8Array(size).fill(120));
    },
    cancel,
  });
  return { stream, cancel, pulledBytes: () => pulled };
}

describe("readCappedText", () => {
  it("lê o corpo inteiro quando cabe no teto (UTF-8 íntegro entre pedaços)", async () => {
    const bytes = encoder.encode('{"a":"ação"}');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    expect(await readCappedText(stream, 1024)).toEqual({ ok: true, text: '{"a":"ação"}' });
  });

  it("sem corpo é texto vazio", async () => {
    expect(await readCappedText(null, 10)).toEqual({ ok: true, text: "" });
  });

  it("passou do teto: para de ler, cancela o fluxo e recusa — sem juntar o resto em memória", async () => {
    const { stream, cancel, pulledBytes } = endlessStream(64 * 1024);
    expect(await readCappedText(stream, 1024 * 1024)).toEqual({ ok: false });
    expect(cancel).toHaveBeenCalled();
    expect(pulledBytes()).toBeLessThanOrEqual(1024 * 1024 + 3 * 64 * 1024);
  });

  it("exatamente no teto ainda cabe", async () => {
    const stream = new Response("x".repeat(100)).body;
    expect(await readCappedText(stream, 100)).toEqual({ ok: true, text: "x".repeat(100) });
    expect(await readCappedText(new Response("x".repeat(101)).body, 100)).toEqual({ ok: false });
  });
});
