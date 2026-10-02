import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

/** Uma linha rótulo/valor — cópia fiel do helper `InfoRow` de `LEGACY/src/pages/NfceDetailPage.tsx`. */
export function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 py-2 text-sm border-b border-border/30 last:border-0 ${highlight ? "bg-primary/5 -mx-3 px-3 rounded-md" : ""}`}>
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={`text-right ${mono ? "font-mono tabular-nums" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

/** Um cartão de seção com ícone/título — cópia fiel do helper `SectionCard` do legado. */
export function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="shadow-sm border overflow-hidden">
      <CardHeader className="pb-2 bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          <span>{title}</span>
          {subtitle && <span className="text-xs font-normal text-muted-foreground ml-auto">{subtitle}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}
