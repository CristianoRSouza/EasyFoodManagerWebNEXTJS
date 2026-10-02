import { describe, expect, it } from "vitest";
import { describeChange, fieldLabel, formatFieldValue } from "./field-labels";

/**
 * `Intl` com pt-BR separa "R$" do numero com ESPACO NAO SEPARAVEL (U+00A0), nao com espaco
 * comum. A diferenca e invisivel no editor e no diff do teste — "R$ 6,00" contra "R$ 6,00"
 * parecem iguais e a assercao falha assim mesmo. Normalizar aqui, e nao na producao, porque
 * o NBSP esta certo: e ele que impede a quebra de linha entre o cifrao e o valor.
 */
const semNbsp = (s: string) => s.replace(/ /g, " ");

describe("rótulo da coluna", () => {
  it("traduz o que conhece", () => {
    expect(fieldLabel("products", "sale_price")).toEqual({ text: "Preço de venda", technical: false });
    expect(fieldLabel("units", "short_description")).toEqual({ text: "Sigla", technical: false });
  });

  it("recua para o nome técnico, MARCADO como técnico", () => {
    // O recuo precisa ser distinguível pelo chamador: nome de banco merece fonte mono e
    // sinaliza "a tela não conhece esta coluna". Inventar um rótulo bonito seria pior que
    // mostrar o nome cru — o operador não teria como saber que é palpite.
    expect(fieldLabel("products", "coluna_nova_qualquer")).toEqual({
      text: "coluna_nova_qualquer",
      technical: true,
    });
    expect(fieldLabel("tabela_que_ninguem_classificou", "x")).toEqual({ text: "x", technical: true });
  });
});

describe("formatação do valor", () => {
  it("RED-GREEN: preço vira moeda — foi este o defeito visível", () => {
    // `to_jsonb` converte numeric em número JSON, entao 6.00 chega como 6 e a tela mostrava
    // "sale_price 6 → 9". Quem decide que aquilo e dinheiro e o NOME DA COLUNA, nao o tipo
    // do valor recebido.
    expect(semNbsp(formatFieldValue("products", "sale_price", 6))).toBe("R$ 6,00");
    expect(semNbsp(formatFieldValue("products", "sale_price", 9))).toBe("R$ 9,00");
    expect(semNbsp(formatFieldValue("order_items", "unit_price", "12.5"))).toBe("R$ 12,50");
  });

  it("quantidade aceita fração sem virar moeda", () => {
    expect(formatFieldValue("products", "stock_quantity", 11)).toBe("11");
    expect(formatFieldValue("order_items", "quantity", 0.325)).toBe("0,325");
  });

  it("booleano vira sim/não em qualquer das formas que o banco devolve", () => {
    expect(formatFieldValue("products", "is_active", true)).toBe("sim");
    expect(formatFieldValue("products", "is_active", false)).toBe("não");
    expect(formatFieldValue("products", "is_active", "t")).toBe("sim");
    expect(formatFieldValue("products", "is_active", "f")).toBe("não");
  });

  it("nulo e string vazia dizem 'vazio' — não uma célula em branco", () => {
    // Célula em branco é ambígua: não se sabe se o valor sumiu ou se a tela falhou.
    expect(formatFieldValue("products", "description", null)).toBe("vazio");
    expect(formatFieldValue("products", "description", "   ")).toBe("vazio");
  });

  it("URL de imagem mostra o FIM — o começo repetido não informa", () => {
    const url = `http://127.0.0.1:3001/images/${"a".repeat(60)}.jpg`;
    const saida = formatFieldValue("products", "image_url", url);
    expect(saida.startsWith("…")).toBe(true);
    expect(saida.endsWith(".jpg")).toBe(true);
  });

  it("valor nao numerico numa coluna numerica sai cru, nunca NaN", () => {
    // Uma tela de diagnostico que mostra "NaN" perdeu a unica informacao que tinha.
    expect(formatFieldValue("products", "sale_price", "indefinido")).toBe("indefinido");
  });

  it("coluna desconhecida cai em texto, sem quebrar", () => {
    expect(formatFieldValue("tabela_nova", "campo_novo", 42)).toBe("42");
  });
});

describe("campos fiscais", () => {
  it("alíquota é ponto percentual, não fração — 18 é 18%, nunca 1800%", () => {
    // O banco guarda 18 para 18%. `Intl` com style:"percent" multiplicaria por 100; o erro
    // sairia plausível na tela (um número com % no fim) e só seria notado quando alguém
    // fosse conferir uma nota rejeitada.
    expect(formatFieldValue("product_fiscal", "icms_aliquota", 18)).toBe("18%");
    expect(formatFieldValue("product_fiscal", "icms_aliquota", 0)).toBe("0%");
    expect(formatFieldValue("product_fiscal", "pis_aliquota", 1.65)).toBe("1,65%");
  });

  it("siglas continuam siglas — traduzir CFOP não ajudaria quem mexe nisto", () => {
    expect(fieldLabel("product_fiscal", "cfop")).toEqual({ text: "CFOP", technical: false });
    expect(fieldLabel("product_fiscal", "ncm")).toEqual({ text: "NCM", technical: false });
    expect(fieldLabel("product_fiscal", "icms_origin").text).toBe("Origem da mercadoria");
  });

  it("o de→para fiscal completo, como a tela mostra", () => {
    expect(
      describeChange("product_fiscal", ["cfop", "icms_aliquota"], {
        cfop: { from: "5102", to: "5405" },
        icms_aliquota: { from: 0, to: 18 },
      }),
    ).toBe("CFOP: de 5102 para 5405; Alíquota ICMS: de 0% para 18%");
  });
});

describe("resumo em texto", () => {
  it("descreve a mudança sem depender de cor nem de seta", () => {
    // O que a seta e a cor dizem visualmente tem de existir tambem em texto: e o que vai
    // no `title` e o que um leitor de tela anuncia.
    expect(
      semNbsp(describeChange("products", ["sale_price"], { sale_price: { from: 6, to: 9 } })),
    ).toBe("Preço de venda: de R$ 6,00 para R$ 9,00");
  });

  it("sem detalhe, lista só os rótulos — o caso das entidades com segredo", () => {
    expect(describeChange("nfce_issuer_config", ["apikey_easyerp"], null)).toBe("apikey_easyerp");
  });

  it("sem campos, não há resumo", () => {
    expect(describeChange("products", null, null)).toBe("");
    expect(describeChange("products", [], null)).toBe("");
  });
});
