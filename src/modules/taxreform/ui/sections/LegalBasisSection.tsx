"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsLegalBasis } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/** Fundamentação Legal CBS/IBS. */
export function LegalBasisSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsLegalBasis[]>([]);

  return (
    <LazyFiscalCard
      key={`legal-${refreshKey}`}
      icon={<Shield className="h-4 w-4 text-primary" />}
      title="Fundamentação Legal CBS/IBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchLegalBasis(500));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma fundamentação legal encontrada</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód. Classe</TableHead>
                <TableHead>Descrição Classe</TableHead>
                <TableHead>Cód. Situação</TableHead>
                <TableHead>Situação Tributária</TableHead>
                <TableHead>Subconjunto</TableHead>
                <TableHead>Referência Legal</TableHead>
                <ResponsiveTableHead hideBelow="sm">Vigência De</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="md">Vigência Até</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((b) => matchesYear([b.valid_from, b.valid_to]))
                .map((b, i) => (
                  <TableRow key={`${b.tax_class_code}-${i}`}>
                    <ResponsiveTableCell className="font-mono text-sm font-medium">{b.tax_class_code}</ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-48 truncate text-sm" title={b.tax_class_description}>
                      {b.tax_class_description}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="font-mono text-sm">{b.tax_situation_code ?? "—"}</ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-40 truncate text-sm" title={b.tax_situation_description ?? ""}>
                      {b.tax_situation_description ?? "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-32 truncate text-sm" title={b.tax_subset_label ?? ""}>
                      {b.tax_subset_label ?? "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-40 truncate text-xs" title={b.statutory_reference ?? ""}>
                      {b.statutory_reference ?? "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="sm" className="text-sm">
                      {formatDateOnlyBR(b.valid_from)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {b.valid_to ? formatDateOnlyBR(b.valid_to) : "—"}
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
