/**
 * Como uma coluna do banco se apresenta na aba Alterações.
 *
 * Porta de `LEGACY/src/lib/sync-mirror-campos.ts`.
 *
 * ► O PROBLEMA QUE ISTO RESOLVE
 *
 *   `sale_price 6 → 9` não diz a quem opera a loja se é real, unidade ou percentual. Quem sabe
 *   que aquilo é dinheiro é o NOME DA COLUNA, não o tipo do valor (`to_jsonb` converte `numeric`
 *   em número JSON, então `6.00` chega como `6`).
 *
 * ► O RECUO É O NOME TÉCNICO, NUNCA UM PALPITE
 *
 *   Coluna que não está no dicionário aparece com o nome cru, marcada como técnica (fonte mono na
 *   tela). Tabela nova no serviço cai nesse caso sozinha.
 */

/** Como o valor daquela coluna deve ser lido. */
type FieldFormat = "currency" | "quantity" | "percent" | "boolean" | "date" | "text" | "url";

interface FieldDef {
  label: string;
  format: FieldFormat;
}

/**
 * Dicionário por entidade. Só colunas que o serviço realmente sincroniza — conferidas contra
 * `information_schema` do PG local (no legado), não de memória.
 */
const FIELDS: Record<string, Record<string, FieldDef>> = {
  products: {
    description: { label: "Descrição", format: "text" },
    sale_price: { label: "Preço de venda", format: "currency" },
    barcode: { label: "Código de barras", format: "text" },
    stock_quantity: { label: "Estoque", format: "quantity" },
    image_url: { label: "Imagem", format: "url" },
    image_updated_at: { label: "Imagem atualizada em", format: "date" },
    is_active: { label: "Ativo", format: "boolean" },
    unit_code: { label: "Código da unidade", format: "text" },
    unit_id: { label: "Unidade", format: "text" },
    legacy_id: { label: "Código no PDV", format: "text" },
  },
  units: {
    short_description: { label: "Sigla", format: "text" },
    description: { label: "Descrição", format: "text" },
    is_fractional: { label: "Fracionada", format: "boolean" },
    is_active: { label: "Ativa", format: "boolean" },
    legacy_code: { label: "Código no PDV", format: "text" },
  },
  orders: {
    barcode: { label: "Comanda", format: "text" },
    customer_name: { label: "Cliente", format: "text" },
    status: { label: "Situação", format: "text" },
    table_name: { label: "Mesa", format: "text" },
    totem_name: { label: "Totem", format: "text" },
    fb_sale_id: { label: "Venda no PDV", format: "text" },
    sync_close_pending: { label: "Fechamento pendente", format: "boolean" },
    sync_closed_to_fb_at: { label: "Fechada no PDV em", format: "date" },
  },
  order_items: {
    product_name: { label: "Produto", format: "text" },
    product_barcode: { label: "Código de barras", format: "text" },
    quantity: { label: "Quantidade", format: "quantity" },
    unit_price: { label: "Preço unitário", format: "currency" },
    subtotal: { label: "Subtotal", format: "currency" },
    status: { label: "Situação", format: "text" },
    origin: { label: "Origem", format: "text" },
    fb_id: { label: "Item no PDV", format: "text" },
  },
  // Fiscal é a entidade onde o detalhe mais importa: um CFOP ou uma alíquota trocada por
  // engano não tem sintoma nenhum até a nota ser rejeitada na SEFAZ. As siglas ficam como
  // siglas — quem mexe nisto lê CFOP e CST melhor do que leria uma tradução — e o que
  // ganha nome por extenso é só o que é ambíguo fora do contexto fiscal.
  product_fiscal: {
    ncm: { label: "NCM", format: "text" },
    cfop: { label: "CFOP", format: "text" },
    cfop_description: { label: "Descrição do CFOP", format: "text" },
    cest: { label: "CEST", format: "text" },
    csosn: { label: "CSOSN", format: "text" },
    cst_icms: { label: "CST ICMS", format: "text" },
    cst_pis: { label: "CST PIS", format: "text" },
    cst_cofins: { label: "CST COFINS", format: "text" },
    icms_origin: { label: "Origem da mercadoria", format: "text" },
    icms_aliquota: { label: "Alíquota ICMS", format: "percent" },
    icms_aliquota_fe: { label: "Alíquota ICMS (FE)", format: "percent" },
    icms_st_aliquota: { label: "Alíquota ICMS ST", format: "percent" },
    icms_reduction_percent: { label: "Redução da base ICMS", format: "percent" },
    icms_st_reduction_percent: { label: "Redução da base ICMS ST", format: "percent" },
    icms_st_margin_value: { label: "MVA ICMS ST", format: "percent" },
    icms_description: { label: "Descrição do ICMS", format: "text" },
    icms_message: { label: "Mensagem do ICMS", format: "text" },
    pis_aliquota: { label: "Alíquota PIS", format: "percent" },
    pis_aliquota_value: { label: "Valor da alíquota PIS", format: "quantity" },
    pis_description: { label: "Descrição do PIS", format: "text" },
    cofins_aliquota: { label: "Alíquota COFINS", format: "percent" },
    cofins_aliquota_value: { label: "Valor da alíquota COFINS", format: "quantity" },
    cofins_description: { label: "Descrição do COFINS", format: "text" },
    aliquota_credito_sn: { label: "Crédito Simples Nacional", format: "percent" },
    aliquota_nacional: { label: "Alíquota nacional", format: "percent" },
    aliquota_importado: { label: "Alíquota importado", format: "percent" },
    aliquota_estadual: { label: "Alíquota estadual", format: "percent" },
    fiscal_unit: { label: "Unidade fiscal", format: "text" },
    tax_benefit_code: { label: "Código de benefício fiscal", format: "text" },
    ibscbs_tax_class_code: { label: "Classe tributária IBS/CBS", format: "text" },
    tax_rule_description: { label: "Regra tributária", format: "text" },
    ipi_tax_situation: { label: "Situação do IPI", format: "text" },
    reseller_flag: { label: "Revenda", format: "text" },
    origin_state: { label: "UF de origem", format: "text" },
  },
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** Rótulo da coluna e se ele é humano ou o nome técnico (que merece fonte mono). */
export function fieldLabel(entity: string, column: string): { text: string; technical: boolean } {
  const def = FIELDS[entity]?.[column];
  return def ? { text: def.label, technical: false } : { text: column, technical: true };
}

/**
 * Valor pronto para ler. Nunca lança: uma tela de diagnóstico que quebra por causa de um valor
 * inesperado é pior que uma que mostra o valor cru.
 */
export function formatFieldValue(entity: string, column: string, value: unknown): string {
  if (value === null || value === undefined) return "vazio";

  const format = FIELDS[entity]?.[column]?.format ?? "text";

  if (typeof value === "boolean") return value ? "sim" : "não";

  if (format === "boolean") {
    // Postgres devolve booleano como booleano, mas `t`/`f` aparecem em coluna `character`.
    if (value === "t" || value === "true") return "sim";
    if (value === "f" || value === "false") return "não";
  }

  if (format === "currency" || format === "quantity" || format === "percent") {
    const n = typeof value === "number" ? value : Number(String(value));
    if (Number.isFinite(n)) {
      if (format === "currency") return currency.format(n);
      // Alíquota já vem EM PONTOS PERCENTUAIS no banco (18 = 18%), não como fração.
      if (format === "percent") return `${quantity.format(n)}%`;
      return quantity.format(n);
    }
    // Não numérico numa coluna numérica: mostra cru em vez de "NaN".
    return String(value);
  }

  if (format === "date") {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
    }
    return String(value);
  }

  const s = String(value);
  if (s.trim() === "") return "vazio";
  // URL de imagem é longa e o que muda nela é o fim; o começo repetido não informa.
  if (format === "url" && s.length > 48) return `…${s.slice(-40)}`;
  if (s.length > 120) return `${s.slice(0, 117)}…`;
  return s;
}

/**
 * Resumo de uma linha em texto, para o `title` e para leitor de tela — onde a seta visual e as
 * cores não chegam.
 */
export function describeChange(
  entity: string,
  fields: string[] | null,
  detail: Record<string, { from: unknown; to: unknown }> | null,
): string {
  if (!fields || fields.length === 0) return "";
  return fields
    .map((c) => {
      const { text } = fieldLabel(entity, c);
      const change = detail?.[c];
      if (!change) return text;
      return `${text}: de ${formatFieldValue(entity, c, change.from)} para ${formatFieldValue(entity, c, change.to)}`;
    })
    .join("; ");
}
