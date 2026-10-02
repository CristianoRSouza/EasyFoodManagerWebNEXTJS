"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateTime } from "@/shared/format/date-time";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsCstIbscbs } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/** CST IBS/CBS. */
export function CstIbscbsSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsCstIbscbs[]>([]);

  return (
    <LazyFiscalCard
      key={`cstibscbs-${refreshKey}`}
      icon={<Hash className="h-4 w-4 text-primary" />}
      title="CST IBS/CBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchCstIbscbs(300));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum CST IBS/CBS encontrado</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código CST</TableHead>
                <TableHead>Descrição</TableHead>
                <ResponsiveTableHead hideBelow="md">Data Referência</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="sm">Vigência De</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="md">Vigência Até</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="lg">Atualizado em</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((c) => matchesYear([c.reference_date, c.valid_from, c.valid_to]))
                .map((c) => (
                  <TableRow key={c.api_record_id}>
                    <ResponsiveTableCell className="font-mono text-sm font-medium">{c.cst_code}</ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm">{c.description}</ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {formatDateOnlyBR(c.reference_date)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="sm" className="text-sm">
                      {formatDateOnlyBR(c.valid_from)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {c.valid_to ? formatDateOnlyBR(c.valid_to) : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                      {formatDateTime(c.updated_at)}
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
