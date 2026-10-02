"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateTime } from "@/shared/format/date-time";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsUnionReferenceRate } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/** Alíquota CBS da União — card eager (leve, sem paginação). */
export function UnionRateSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsUnionReferenceRate[]>([]);

  return (
    <LazyFiscalCard
      key={`union-${refreshKey}`}
      eager
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      title="Alíquota CBS da União"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchUnionReferenceRate(30));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma alíquota de referência encontrada</p>
      ) : (
        <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <ResponsiveTableHead hideBelow="md">Data Referência</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="sm">Vigência De</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="md">Vigência Até</ResponsiveTableHead>
                <TableHead className="text-right">Alíq. Referência</TableHead>
                <TableHead className="text-right">Alíq. Própria</TableHead>
                <ResponsiveTableHead hideBelow="lg">Atualizado em</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((r) => matchesYear([r.reference_date, r.valid_from, r.valid_to]))
                .map((r, i) => (
                  <TableRow key={`${r.reference_date}-${i}`}>
                    <ResponsiveTableCell hideBelow="md" className="font-mono text-sm">
                      {formatDateOnlyBR(r.reference_date)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="sm" className="text-sm">
                      {formatDateOnlyBR(r.valid_from)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {r.valid_to ? formatDateOnlyBR(r.valid_to) : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right font-mono text-sm font-medium">
                      {Number(r.reference_rate).toFixed(2)}%
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right font-mono text-sm font-medium">
                      {Number(r.own_rate).toFixed(2)}%
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                      {formatDateTime(r.updated_at)}
                    </ResponsiveTableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ResponsiveTableWrapper>
      )}
    </LazyFiscalCard>
  );
}
