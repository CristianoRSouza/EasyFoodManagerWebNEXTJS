"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateTime } from "@/shared/format/date-time";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsTaxClassIbscbs } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/** Classificação Tributária IBS/CBS. */
export function TaxClassIbscbsSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsTaxClassIbscbs[]>([]);

  return (
    <LazyFiscalCard
      key={`taxclass-${refreshKey}`}
      icon={<Hash className="h-4 w-4 text-primary" />}
      title="Classificação Tributária IBS/CBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchTaxClassIbscbs(300));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma classificação tributária encontrada</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód. Classe</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo Alíquota</TableHead>
                <TableHead>Tratamento Tributário</TableHead>
                <TableHead className="text-right">% Red. CBS</TableHead>
                <TableHead className="text-right">% Red. IBS UF</TableHead>
                <TableHead className="text-right">% Red. IBS Mun.</TableHead>
                <ResponsiveTableHead hideBelow="sm">Vigência De</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="md">Vigência Até</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="lg">Atualizado em</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((t) => matchesYear([t.valid_from, t.valid_to]))
                .map((t, i) => (
                  <TableRow key={`${t.class_code}-${i}`}>
                    <ResponsiveTableCell className="font-mono text-sm">{t.class_code}</ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-[200px] truncate text-sm" title={t.description}>
                      {t.description}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm">{t.rate_type ?? "—"}</ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-[180px] truncate text-sm" title={t.tax_treatment_description ?? ""}>
                      {t.tax_treatment_description ?? "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right font-mono text-sm">
                      {t.cbs_reduction_percent != null ? `${Number(t.cbs_reduction_percent).toFixed(2)}%` : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right font-mono text-sm">
                      {t.ibs_state_reduction_percent != null ? `${Number(t.ibs_state_reduction_percent).toFixed(2)}%` : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right font-mono text-sm">
                      {t.ibs_municipality_reduction_percent != null ? `${Number(t.ibs_municipality_reduction_percent).toFixed(2)}%` : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="sm" className="text-sm">
                      {formatDateOnlyBR(t.valid_from)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {t.valid_to ? formatDateOnlyBR(t.valid_to) : "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                      {formatDateTime(t.updated_at)}
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
