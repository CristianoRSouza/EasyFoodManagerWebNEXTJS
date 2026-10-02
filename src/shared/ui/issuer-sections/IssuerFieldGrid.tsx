import type { ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { ISSUER_GRID } from "./responsive-tokens";

type GridVariant = "threeCols" | "threeColsCompact" | "twoCols" | "mainSections";

interface IssuerFieldGridProps {
  /**
   * Layout responsivo:
   * - `threeCols` (default): 1 → 2 → 3 cols (Dados/Certificado).
   * - `threeColsCompact`: 1 → 3 cols (EasyERP IDs).
   * - `twoCols`: 1 → 2 cols (textos lado-a-lado tipo infCpl).
   * - `mainSections`: layout do bloco principal de cards (1 → 2 → 3).
   */
  variant?: GridVariant;
  className?: string;
  children: ReactNode;
}

/**
 * Grid responsivo padronizado para campos dentro dos cards do Emitente NFC-e.
 * Empilha no mobile e expande para múltiplas colunas em telas maiores.
 */
export function IssuerFieldGrid({
  variant = "threeCols",
  className,
  children,
}: IssuerFieldGridProps) {
  return <div className={cn(ISSUER_GRID[variant], className)}>{children}</div>;
}
