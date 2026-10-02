import type { ElementType } from "react";
import { Card, CardContent } from "@/shared/ui/primitives/card";

/**
 * Cartão-resumo (ícone + número + rótulo + subtítulo opcional) das telas de Totens e Agentes.
 * Cópia fiel do `SummaryCard` que o legado duplica em `pages/TotemConfigPage.tsx` e
 * `pages/AgentConfigPage.tsx` (JSX idêntico) — unificado aqui (fase-4-revisao-final.md, Menor 3).
 */
export function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: ElementType;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
          <Icon className={`h-4.5 w-4.5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
