import * as React from "react";
import type { ReactNode, HTMLAttributes } from "react";
import { TableHead, TableCell } from "@/shared/ui/primitives/table";
import { cn } from "@/shared/ui/cn";

/**
 * Camada compartilhada para padronizar o comportamento responsivo das tabelas
 * do Emitente NFC-e (e demais listas longas).
 *
 * Recursos:
 * - Wrapper com rolagem horizontal suave (-webkit-overflow-scrolling: touch)
 *   e dica visual via gradiente nas bordas em mobile.
 * - Classes utilitárias para esconder colunas por breakpoint sem reescrever
 *   a estrutura da tabela: <TableHead className={hideOn("sm")}>...
 * - Componentes ResponsiveTableHead / ResponsiveTableCell que aceitam a prop
 *   `hideBelow` para padronizar a regra (mobile-first).
 *
 * Breakpoints (Tailwind):
 *   - "sm" → some abaixo de 640px (apenas mobile pequeno)
 *   - "md" → some abaixo de 768px (mobile)
 *   - "lg" → some abaixo de 1024px (mobile + tablet)
 *   - "xl" → some abaixo de 1280px (mobile + tablet + laptops pequenos)
 */

export type Breakpoint = "sm" | "md" | "lg" | "xl";

const HIDE_BELOW: Record<Breakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export const hideBelow = (bp: Breakpoint): string => HIDE_BELOW[bp];

/** Wrapper com rolagem horizontal otimizada para mobile + altura máxima opcional. */
interface ResponsiveTableWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Altura máxima (ex: "32rem"); habilita scroll vertical interno. */
  maxHeight?: string;
}

export function ResponsiveTableWrapper({
  children,
  maxHeight,
  className,
  ...rest
}: ResponsiveTableWrapperProps) {
  return (
    <div
      {...rest}
      className={cn(
        "relative -mx-3 sm:mx-0 overflow-x-auto overflow-y-auto",
        "[-webkit-overflow-scrolling:touch]",
        // Sombra/gradiente sutil nas bordas para indicar conteúdo rolável (mobile)
        "[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]",
        "sm:[mask-image:none]",
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="min-w-full px-3 sm:px-0">{children}</div>
    </div>
  );
}

interface RTHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  hideBelow?: Breakpoint;
  children?: ReactNode;
}

/** TableHead que pode ser ocultado abaixo de um breakpoint via prop. */
export function ResponsiveTableHead({
  hideBelow: hb,
  className,
  children,
  ...rest
}: RTHeadProps) {
  return (
    <TableHead
      {...rest}
      className={cn(hb ? HIDE_BELOW[hb] : "", className)}
    >
      {children}
    </TableHead>
  );
}

interface RTCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  hideBelow?: Breakpoint;
  children?: ReactNode;
}

/** TableCell que pode ser ocultado abaixo de um breakpoint via prop. */
export function ResponsiveTableCell({
  hideBelow: hb,
  className,
  children,
  ...rest
}: RTCellProps) {
  return (
    <TableCell
      {...rest}
      className={cn(hb ? HIDE_BELOW[hb] : "", className)}
    >
      {children}
    </TableCell>
  );
}
