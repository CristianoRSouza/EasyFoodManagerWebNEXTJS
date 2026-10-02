"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { NfceItem } from "../../domain/nfce-item";
import { formatCurrency } from "../../domain/nfce-formatters";
import { NfceItemExpandedDetails } from "./NfceItemExpandedDetails";

/** Aba "Produtos" — tabela com expansão por linha (detalhe fiscal completo) — cópia fiel do legado. */
export function NfceItemsTab({ items }: { items: NfceItem[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (sequence: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sequence)) next.delete(sequence);
      else next.add(sequence);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <div className="rounded-full bg-muted/50 p-4 mb-3">
          <Package className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">Nenhum produto encontrado</p>
      </div>
    );
  }

  const totalGross = items.reduce((sum, item) => sum + item.grossValue, 0);
  const totalTaxes = items.reduce((sum, item) => sum + (item.totalTaxes ?? 0), 0);

  return (
    <Card className="shadow-sm border overflow-hidden">
      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 font-semibold text-xs uppercase tracking-wider">#</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">Código</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">NCM</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">CFOP</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">Unid</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Qtd</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Preço Unit.</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Valor</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">CST</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <Fragment key={item.sequence}>
                <TableRow className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => toggle(item.sequence)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sequence}</TableCell>
                  <TableCell className="font-mono text-xs">{item.productCode}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={item.description}>
                    {item.description}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.ncm}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.cfop}</TableCell>
                  <TableCell className="text-xs">{item.unit}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{item.quantity.toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{formatCurrency(item.grossValue)}</TableCell>
                  <TableCell className="font-mono text-xs">{item.icms.cstOrCsosn ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {expanded.has(item.sequence) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
                {expanded.has(item.sequence) && (
                  <TableRow key={`detail-${item.sequence}`}>
                    <TableCell colSpan={11} className="bg-muted/20 border-l-2 border-l-primary/30 p-4">
                      <NfceItemExpandedDetails item={item} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-8 border-t bg-muted/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Total Bruto: <strong className="font-mono tabular-nums text-foreground">{formatCurrency(totalGross)}</strong>
          </span>
          <span className="text-muted-foreground">
            Total Tributos: <strong className="font-mono tabular-nums text-foreground">{formatCurrency(totalTaxes)}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
