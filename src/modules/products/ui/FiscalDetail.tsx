import type { ReactNode } from "react";

/** Formata alíquota de referência do NCM (Lei 12.741) como percentual com 4 casas. */
export function fmtNcmAliquota(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return `${n.toFixed(4)}%`;
}

export function FiscalDetail({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 gap-4">
      <span className="text-muted-foreground text-xs whitespace-nowrap">{label}</span>
      <span className={`text-xs font-medium text-right max-w-[65%] break-words ${highlight ? "text-primary" : ""}`}>
        {value ?? <span className="italic text-muted-foreground/60">—</span>}
      </span>
    </div>
  );
}

/** Cartão de seção dentro do painel de detalhes fiscais expandido. */
export function FiscalSection({
  icon,
  title,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border/60 bg-card/60 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/40">
        {icon}
        <span className="text-xs font-semibold tracking-wide uppercase text-foreground/80">{title}</span>
      </div>
      <div className="px-4 py-2 divide-y divide-border/20">{children}</div>
    </div>
  );
}
