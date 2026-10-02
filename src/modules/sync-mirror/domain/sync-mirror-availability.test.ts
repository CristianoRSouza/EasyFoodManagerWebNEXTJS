import { describe, expect, it } from "vitest";
import { isSyncMirrorAvailable } from "./sync-mirror-availability";

/**
 * Porta de `LEGACY/src/lib/__tests__/sync-mirror-mode.guard.test.ts`. Os casos de Electron e do
 * conjunto de exemplo não existem no Next (não há esses modos); ficam os dois que importam: a
 * loja mostra, a nuvem — por qualquer caminho — não.
 */
describe("Espelho FB↔PG — onde a tela pode aparecer", () => {
  it("loja (easyfoodmanagerAPI, antigo Modo 2): aparece", () => {
    expect(isSyncMirrorAvailable("lan")).toBe(true);
  });

  it("nuvem (EasyFoodAPI): NÃO aparece", () => {
    expect(isSyncMirrorAvailable("cloud")).toBe(false);
  });
});
