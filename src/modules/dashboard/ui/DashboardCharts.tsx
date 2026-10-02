"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface SyncDatum {
  hour: string;
  ok: number;
  error: number;
}
interface TxDatum {
  day: string;
  total: number;
  amount: number;
}
interface AttentionDatum {
  name: string;
  total: number;
}

export interface DashboardChartsProps {
  variant: "attention" | "sync" | "transactions";
  data: AttentionDatum[] | SyncDatum[] | TxDatum[];
  onAttentionClick?: (name: string) => void;
}

/** Porta 1:1 de `easyfoodmanagerWEB/src/components/dashboard/DashboardCharts.tsx`. */
export function DashboardCharts({ variant, data, onAttentionClick }: DashboardChartsProps) {
  if (variant === "attention") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data as AttentionDatum[]} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            formatter={(value: number, _name: string, entry: { payload?: AttentionDatum }) => [
              `${value} nota(s)`,
              `${entry?.payload?.name || "Categoria"} (clique para filtrar)`,
            ]}
          />
          <Bar
            dataKey="total"
            fill="hsl(var(--warning))"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            activeBar={{ fill: "hsl(var(--warning) / 0.75)" }}
            onClick={(payload: { name?: string } | undefined) => {
              const name = String(payload?.name || "");
              onAttentionClick?.(name);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (variant === "sync") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data as SyncDatum[]}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Bar dataKey="ok" fill="hsl(var(--success))" name="OK" radius={[2, 2, 0, 0]} />
          <Bar dataKey="error" fill="hsl(var(--destructive))" name="Erro" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // transactions
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data as TxDatum[]}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
        <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="Valor (R$)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
