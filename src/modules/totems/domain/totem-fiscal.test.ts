import { describe, it, expect } from "vitest";
import {
  normalizeTotemFiscalFields,
  nextNfceNumberFromSeries,
  formatTpAmbLabel,
  formatTpAmbShort,
  decideSeriesOwnerAction,
  describeTotemSeriesOwner,
  type TotemSeriesOwner,
} from "./totem-fiscal";

// Port literal de LEGACY/src/lib/__tests__/totem-fiscal.test.ts (menos o caso da SQL, que não
// existe neste módulo — ver comentário no topo de totem-fiscal.ts).
describe("totem-fiscal", () => {
  describe("normalizeTotemFiscalFields", () => {
    it("normaliza tpAmb valido", () => {
      expect(normalizeTotemFiscalFields({ nfce_environment: 1 })).toEqual({
        nfceEnvironment: 1,
        nfceSerie: 1,
      });
    });

    it("ambiente invalido vira homolog (2)", () => {
      expect(normalizeTotemFiscalFields({ nfce_environment: 9 })).toEqual({
        nfceEnvironment: 2,
        nfceSerie: 1,
      });
    });

    it("normaliza nfce_serie entre 1 e 999", () => {
      expect(normalizeTotemFiscalFields({ nfce_serie: 42 })).toEqual({
        nfceEnvironment: 2,
        nfceSerie: 42,
      });
      expect(normalizeTotemFiscalFields({ nfce_serie: 0 })).toEqual({
        nfceEnvironment: 2,
        nfceSerie: 1,
      });
    });

    it("default homolog quando nfce_environment ausente", () => {
      expect(normalizeTotemFiscalFields({})).toEqual({
        nfceEnvironment: 2,
        nfceSerie: 1,
      });
    });
  });

  describe("nextNfceNumberFromSeries", () => {
    it("retorna current + 1", () => {
      expect(nextNfceNumberFromSeries(129)).toBe(130);
      expect(nextNfceNumberFromSeries(0)).toBe(1);
    });

    it("fallback seguro para valores invalidos", () => {
      expect(nextNfceNumberFromSeries(Number.NaN)).toBe(1);
      expect(nextNfceNumberFromSeries(-5)).toBe(1);
    });
  });

  describe("formatTpAmb*", () => {
    it("rotula producao e homolog", () => {
      expect(formatTpAmbLabel(1)).toBe("Produção");
      expect(formatTpAmbLabel(2)).toBe("Homologação");
      expect(formatTpAmbShort(1)).toBe("Prod");
      expect(formatTpAmbShort(2)).toBe("Homolog");
    });
  });
});

// Legado 1.3.13 (PR #56, `LEGACY/src/lib/__tests__/totem-series-owner.test.ts`). 30/09/2026: a
// série 1 de homologação do TOTEM-CAIXA-03 estava presa ao TOTEM-01 (inativo) e o totem não emitia.
// A tela pergunta antes de salvar — mesma regra da Admin API (reconcileTotemSeriesOwnership), que
// devolve 409 se a tela não perguntar. O caso `TOTEM_SERIES_OWNER_SQL` do legado é do ramo
// Electron (SQL direto) e não existe aqui; a consulta equivalente é a rota
// `GET /v1/totems/series-owner` — coberta em `infrastructure/api-totem-repository.test.ts`.
const owner = (active: boolean | null): TotemSeriesOwner => ({
  series_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  serie: 1,
  environment: 2,
  current_number: 41,
  owner_totem_id: active === null ? null : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  owner_totem_name: active === null ? null : "TOTEM-01",
  owner_active: active,
});

describe("decideSeriesOwnerAction", () => {
  it("série livre segue direto", () => {
    expect(decideSeriesOwnerAction(null, true)).toBe("none");
  });

  it("dono inativo, totem ativo: pede confirmação da transferência", () => {
    expect(decideSeriesOwnerAction(owner(false), true)).toBe("confirm_transfer");
  });

  it("linha antiga sem totem também pede confirmação", () => {
    expect(decideSeriesOwnerAction(owner(null), true)).toBe("confirm_transfer");
  });

  it("dono ativo bloqueia", () => {
    expect(decideSeriesOwnerAction(owner(true), true)).toBe("blocked");
  });

  it("totem salvo inativo não é bloqueado nem perguntado", () => {
    expect(decideSeriesOwnerAction(owner(true), false)).toBe("none");
    expect(decideSeriesOwnerAction(owner(false), false)).toBe("none");
  });
});

describe("describeTotemSeriesOwner", () => {
  it("diz série, ambiente e quem é o dono", () => {
    expect(describeTotemSeriesOwner(owner(false))).toBe(
      "A série 1 de homologação está vinculada ao totem TOTEM-01 (inativo).",
    );
    expect(describeTotemSeriesOwner({ ...owner(true), environment: 1 })).toBe(
      "A série 1 de produção está vinculada ao totem TOTEM-01 (ativo).",
    );
    expect(describeTotemSeriesOwner(owner(null))).toBe(
      "A série 1 de homologação está vinculada a uma configuração antiga sem totem.",
    );
  });
});
