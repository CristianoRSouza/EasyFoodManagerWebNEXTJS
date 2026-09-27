import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/** Tolerância só para anti-aliasing de fonte: até 0,1% dos pixels. */
export const MAX_DIFF_RATIO = 0.001;

export function diffRatio(name: string, legacy: Buffer, next: Buffer): number {
  const a = PNG.sync.read(legacy);
  const b = PNG.sync.read(next);
  if (a.width !== b.width || a.height !== b.height) return 1;
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  if (changed > 0) {
    mkdirSync("tests/visual/output", { recursive: true });
    writeFileSync(`tests/visual/output/${name}-legacy.png`, legacy);
    writeFileSync(`tests/visual/output/${name}-next.png`, next);
    writeFileSync(`tests/visual/output/${name}-diff.png`, PNG.sync.write(diff));
  }
  return changed / (a.width * a.height);
}
