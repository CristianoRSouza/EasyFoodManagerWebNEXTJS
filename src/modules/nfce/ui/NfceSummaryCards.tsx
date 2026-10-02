import { CheckCircle2, XCircle, DollarSign, Calendar, FileX2, Ban } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { formatCurrency, formatDateShort, normalizeNfceStatus } from "../domain/nfce-formatters";
import type { NfceTotals } from "../domain/nfce-note";

interface Props {
  /**
   * Totais do PERÍODO, somados no banco. `null` = ainda carregando.
   *
   * ⚠️ Não derive isto das linhas da tabela. Era assim que funcionava, e como a tela carrega 50
   * por vez, um filtro com 1.164 notas mostrava "50 autorizadas" e somava o valor de 50 — sem
   * nenhum sinal de que faltava o resto. Card de resumo é onde o usuário confere faturamento;
   * errado ali é pior que ausente.
   */
  totals: NfceTotals | null;
  dateFrom?: string;
  dateTo?: string;
}

/** Enquanto não há número, "—" — nunca um zero, que se lê como "não houve nota". */
const NO_DATA = "—";

export function NfceSummaryCards({ totals, dateFrom, dateTo }: Props) {
  /** Dobra os apelidos do banco (`inutilizada` → `inutilized`) antes de contar. */
  const count = (target: string): string => {
    if (!totals) return NO_DATA;
    let n = 0;
    for (const [status, qty] of Object.entries(totals.byStatus)) {
      if (normalizeNfceStatus(status) === target) n += qty;
    }
    return String(n);
  };

  const cards = [
    {
      label: "Autorizadas",
      value: count("authorized"),
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconColor: "text-emerald-500",
      gradient: "from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      label: "Rejeitadas",
      value: count("rejected"),
      icon: <XCircle className="h-5 w-5" />,
      iconColor: "text-red-500",
      gradient: "from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5",
      border: "border-red-500/20",
    },
    {
      label: "Canceladas",
      value: count("cancelled"),
      icon: <Ban className="h-5 w-5" />,
      iconColor: "text-amber-500",
      gradient: "from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5",
      border: "border-amber-500/20",
    },
    {
      label: "Inutilizadas",
      // Conta `inutilized`, que é o que o rótulo diz — não `unusable` ("Contingência
      // pendente"), que tem aviso próprio na tela e não é o que este card anuncia.
      value: count("inutilized"),
      icon: <FileX2 className="h-5 w-5" />,
      iconColor: "text-orange-500",
      gradient: "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/5",
      border: "border-orange-500/20",
    },
    {
      label: "Valor autorizado",
      value: totals ? formatCurrency(totals.authorizedAmount) : NO_DATA,
      icon: <DollarSign className="h-5 w-5" />,
      iconColor: "text-primary",
      gradient: "from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5",
      border: "border-primary/20",
    },
    {
      label: "Período",
      value: dateFrom && dateTo ? `${formatDateShort(dateFrom)} — ${formatDateShort(dateTo)}` : "Todos",
      icon: <Calendar className="h-5 w-5" />,
      iconColor: "text-muted-foreground",
      gradient: "from-muted/60 to-muted/30",
      border: "border-border",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className={`bg-gradient-to-br ${c.gradient} ${c.border} shadow-sm overflow-hidden`}>
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-background/60 ${c.iconColor} shrink-0`}>
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{c.label}</p>
              <p className="text-lg font-bold leading-tight truncate">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
