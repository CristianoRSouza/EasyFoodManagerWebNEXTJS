import { Badge } from "@/shared/ui/primitives/badge";
import { cn } from "@/shared/ui/cn";

const statusStyles: Record<string, string> = {
  open: "bg-info/15 text-info border-info/30",
  closed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  sync_pending: "bg-warning/15 text-warning border-warning/30",
  sync_sent: "bg-success/15 text-success border-success/30",
  fb_linked: "bg-success/15 text-success border-success/30",
  fb_partial: "bg-warning/15 text-warning border-warning/30",
  fb_unlinked: "bg-muted text-muted-foreground border-border/60",
  /** Itens do totem ainda não enviados ao Firebird (bloqueiam fechamento PG→FB). */
  items_pending_fb: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/35",
  tef_cancel_fb_sale_closed: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50",
  active: "bg-success/15 text-success border-success/30",
  ok: "bg-success/15 text-success border-success/30",
  /** Mesmo significado que `ok` em `sync_log` (Sync-Service). */
  success: "bg-success/15 text-success border-success/30",
  /** Linhas antigas em PT na base (legado). */
  Sucesso: "bg-success/15 text-success border-success/30",
  Parcial: "bg-warning/15 text-warning border-warning/30",
  Falha: "bg-destructive/15 text-destructive border-destructive/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  declined: "bg-muted text-muted-foreground border-border/60",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  processing: "bg-info/15 text-info border-info/30",
  tef_requested: "bg-warning/15 text-warning border-warning/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  aborted: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  fb_to_pg: "bg-info/15 text-info border-info/30",
  pg_to_fb: "bg-primary/15 text-primary border-primary/30",
};

const statusLabels: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
  sync_pending: "Fechamento pendente",
  sync_sent: "Fechado no FB",
  fb_linked: "Vinculada ao FB",
  fb_partial: "Vínculo parcial",
  fb_unlinked: "Sem vínculo FB",
  items_pending_fb: "Itens pendentes (PG→FB)",
  tef_cancel_fb_sale_closed: "TEF cancelado · venda FB fechada",
  active: "Ativo",
  ok: "OK",
  success: "Sucesso",
  Sucesso: "Sucesso",
  Parcial: "Parcial",
  Falha: "Falha",
  partial: "Parcial",
  error: "Erro",
  approved: "Aprovada",
  pending: "Pendente",
  declined: "Recusada",
  failed: "Falha",
  processing: "Em processamento",
  tef_requested: "TEF solicitado",
  rejected: "Rejeitada",
  aborted: "Abortada",
  fb_to_pg: "FB → PG",
  pg_to_fb: "PG → FB",
  credit: "Crédito",
  debit: "Débito",
  pix: "PIX",
  cash: "Dinheiro",
  meal_voucher: "Vale Refeição",
  food_voucher: "Vale Alimentação",
  system: "Sistema",
  totem: "Totem",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium text-xs", statusStyles[status] || "bg-muted text-muted-foreground", className)}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}
