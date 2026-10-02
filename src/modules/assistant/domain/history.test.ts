import { describe, expect, it } from "vitest";
import {
  appLabel,
  findFirstMatch,
  formatDateLabel,
  groupHistoryByDate,
  matchesAll,
  parseSearch,
  suggestionsFor,
} from "./history";
import type { ChatHistoryEntry } from "./chat";

const TODAY = new Date(2026, 8, 30, 15, 0);

describe("formatDateLabel", () => {
  it("ontem vira 'Ontem'; demais, data longa pt-BR", () => {
    expect(formatDateLabel("2026-09-29", TODAY)).toBe("Ontem");
    expect(formatDateLabel("2026-09-01", TODAY)).toBe("01 de setembro de 2026");
  });
});

describe("appLabel", () => {
  it("rótulos conhecidos, o próprio nome, ou 'Outro'", () => {
    expect(appLabel("easycommandpay")).toBe("EasyFoodManager");
    expect(appLabel("easyml")).toBe("EasyML");
    expect(appLabel("easyfood-manager")).toBe("easyfood-manager");
    expect(appLabel(null)).toBe("Outro");
  });
});

describe("busca no histórico", () => {
  it("frase exata entre aspas, palavras e curinga *, sem acento e sem caixa", () => {
    const terms = parseSearch('"nota fiscal" pedi*');
    expect(terms.map((t) => t.raw)).toEqual(["nota fiscal", "pedi*"]);
    expect(matchesAll("A NOTA FISCAL do pedido", terms)).toBe(true);
    expect(matchesAll("nota do pedido", terms)).toBe(false);
    expect(matchesAll("Emissão", parseSearch("emissao"))).toBe(true);
  });

  it("sem termos casa tudo", () => {
    expect(matchesAll("qualquer", [])).toBe(true);
    expect(findFirstMatch("qualquer", [])).toBeNull();
  });

  it("findFirstMatch devolve o trecho mais à esquerda; null se algum termo falta", () => {
    expect(findFirstMatch("abc xyz abc", parseSearch("xyz abc"))).toEqual({ start: 0, end: 3 });
    expect(findFirstMatch("abc", parseSearch("abc zzz"))).toBeNull();
  });
});

describe("groupHistoryByDate", () => {
  it("agrupa por dia, do mais recente ao mais antigo", () => {
    const entry = (id: string, date: string): ChatHistoryEntry => ({ id, date, startedAt: 0, endedAt: 0, messages: [] });
    const groups = groupHistoryByDate([entry("a", "2026-09-01"), entry("b", "2026-09-10"), entry("c", "2026-09-01")]);
    expect(groups.map(([date, entries]) => [date, entries.map((e) => e.id)])).toEqual([
      ["2026-09-10", ["b"]],
      ["2026-09-01", ["a", "c"]],
    ]);
  });
});

describe("suggestionsFor", () => {
  it("sugestões da rota ou as padrão", () => {
    expect(suggestionsFor("/nfce")).toEqual(["Como consulto uma NFC-e?", "O que significa Inutilizada?", "Onde vejo o XML?"]);
    expect(suggestionsFor("/manual")).toEqual([
      "Como começo a usar o sistema?",
      "Onde acompanho meus pedidos?",
      "Como configuro a NFC-e?",
    ]);
  });
});
