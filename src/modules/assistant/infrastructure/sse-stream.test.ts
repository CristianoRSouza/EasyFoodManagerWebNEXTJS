import { describe, expect, it } from "vitest";
import { readSseDeltas } from "./sse-stream";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const line = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

describe("readSseDeltas", () => {
  it("entrega cada pedaço, mesmo com a linha partida entre dois chunks e com \\r\\n", async () => {
    const full = `${line("Olá")}: ping\r\n${line(", mundo")}data: [DONE]\n`;
    const cut = full.indexOf("mundo");
    const deltas: string[] = [];
    await readSseDeltas(streamOf([full.slice(0, cut), full.slice(cut)]), (t) => deltas.push(t));
    expect(deltas).toEqual(["Olá", ", mundo"]);
  });

  it("processa a última linha sem \\n no fim", async () => {
    const deltas: string[] = [];
    await readSseDeltas(streamOf([line("a"), line("b").trimEnd()]), (t) => deltas.push(t));
    expect(deltas).toEqual(["a", "b"]);
  });
});
