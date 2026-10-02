/**
 * Tokens centrais de classes Tailwind para a área "Emitente NFC-e".
 *
 * Objetivo: ter uma única fonte de verdade para paddings, gaps, tipografia
 * e breakpoints usados nas linhas (InfoRow / EditableInfoRow), nos cards
 * de seção (IssuerSectionCard) e nas grades de campos (IssuerFieldGrid).
 *
 * Sempre que o design mobile precisar de ajuste, mude aqui — não nos
 * componentes individuais.
 */

/** Classes para a "linha label/valor" (usada por InfoRow e EditableInfoRow). */
export const ISSUER_ROW = {
  /** Container da linha — empilha no mobile, lado-a-lado em ≥sm. */
  container:
    "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-1.5 border-b border-border/30 last:border-0 px-1",
  /** Variante read-only (InfoRow): items-start + py-2 + hover. */
  containerReadonly:
    "flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-border/30 last:border-0 group hover:bg-muted/20 px-1 rounded-sm transition-colors",
  /** Label (esquerda). */
  label:
    "text-muted-foreground text-[12px] sm:text-[13px] leading-5 shrink-0 inline-flex items-center gap-1.5",
  /** Valor (direita). Largura total no mobile, alinhado à direita em ≥sm. */
  value:
    "text-[13px] leading-5 font-medium text-left sm:text-right w-full sm:max-w-[65%] break-all",
  /** Input editável (EditableInfoRow). */
  input: "h-8 text-[13px] w-full sm:max-w-[65%] sm:text-right",
} as const;

/** Classes para os "cards de seção" do emitente (Dados, Endereço, NFC-e, etc.). */
export const ISSUER_CARD = {
  /** Card raiz — usar com `glass-panel` já aplicado pelo wrapper. */
  root: "glass-panel",
  /** Header do card — paddings reduzidos no mobile. */
  header: "pb-2 pt-4 px-3 sm:px-5",
  /** Título dentro do header. */
  title:
    "flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground",
  /** Corpo do card. */
  content: "px-3 sm:px-5 pb-4 pt-1",
} as const;

/** Classes para grades de campos dentro dos cards (1 → 2 → 3 colunas). */
export const ISSUER_GRID = {
  /** 1 col mobile · 2 cols md · 3 cols lg. */
  threeCols: "grid grid-cols-1 gap-y-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3",
  /** 1 col mobile · 3 cols md (compacto). */
  threeColsCompact: "grid grid-cols-1 gap-y-1 gap-x-8 md:grid-cols-3",
  /** 1 col mobile · 2 cols md (lado-a-lado). */
  twoCols: "grid grid-cols-1 gap-5 md:grid-cols-2",
  /** Layout principal de cards (1 → 2 → 3). */
  mainSections: "grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3",
} as const;
