import { deltaOf } from "../domain/chat";

/**
 * Consome o SSE do chat pedaço a pedaço. Os pedaços da rede não respeitam o fim da linha: o que
 * sobra de um espera o próximo para virar linha inteira (o buffer só é consumido em `\n`).
 */
export async function readSseDeltas(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const processLine = (line: string) => {
    const text = deltaOf(line);
    if (text) onDelta(text);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      processLine(line);
    }
  }
  if (buffer.trim()) buffer.split("\n").forEach(processLine);
}
