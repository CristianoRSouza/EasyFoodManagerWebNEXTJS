import { describe, expect, it } from "vitest";
import { HOMOLOG_TITLE_PREFIX, resolveAmbiente, titleForAmbiente } from "./ambiente";

// Mesmas regras de `runtime-config.ts` do legado 1.3.12 (PR #48), agora lidas no servidor.
describe("resolveAmbiente", () => {
  it('só "homolog" liga a homologação', () => {
    expect(resolveAmbiente("homolog")).toBe("homolog");
    expect(resolveAmbiente(" homolog ")).toBe("homolog");
  });

  it("ausente, vazio ou produção explícita é produção", () => {
    expect(resolveAmbiente(undefined)).toBe("producao");
    expect(resolveAmbiente("")).toBe("producao");
    expect(resolveAmbiente("producao")).toBe("producao");
  });

  it("ambiente desconhecido não vira homolog por acidente", () => {
    expect(resolveAmbiente("staging")).toBe("producao");
    expect(resolveAmbiente("HOMOLOGACAO")).toBe("producao");
  });
});

describe("titleForAmbiente", () => {
  it('homologação prefixa "[HOMOLOGAÇÃO] " no título da aba (uma vez só)', () => {
    expect(titleForAmbiente("EasyFood Manager", "homolog")).toBe("[HOMOLOGAÇÃO] EasyFood Manager");
    expect(titleForAmbiente(`${HOMOLOG_TITLE_PREFIX}EasyFood Manager`, "homolog")).toBe("[HOMOLOGAÇÃO] EasyFood Manager");
  });

  it("produção mantém o título", () => {
    expect(titleForAmbiente("EasyFood Manager", "producao")).toBe("EasyFood Manager");
  });
});
