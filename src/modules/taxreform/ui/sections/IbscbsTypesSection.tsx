"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsTaxClassIbscbsType } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/**
 * Tipos de documento IBS/CBS por classificação.
 *
 * 1000, e não 300: esta é a ÚNICA tabela de CBS maior que o teto que a tela pedia (626 linhas —
 * 313 de 2026 e 313 de 2027). O filtro por ano roda no navegador, DEPOIS do corte, então pedir 300
 * significava esconder metade da legislação sem nenhum aviso — mesmo comportamento do legado.
 */
export function IbscbsTypesSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsTaxClassIbscbsType[]>([]);

  return (
    <LazyFiscalCard
      key={`types-${refreshKey}`}
      icon={<Hash className="h-4 w-4 text-primary" />}
      title="Tipos de Documento IBS/CBS por Classificação"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchTaxClassIbscbsType(1000));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum tipo de documento encontrado</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód. Classe</TableHead>
                <ResponsiveTableHead hideBelow="md">Data Ref.</ResponsiveTableHead>
                <TableHead>Sigla</TableHead>
                <TableHead>Cód. Tipo</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((t) => matchesYear([t.reference_date]))
                .map((t, i) => (
                  <TableRow key={`${t.class_code}-${t.acronym}-${i}`}>
                    <ResponsiveTableCell className="font-mono text-sm">{t.class_code}</ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-sm">
                      {formatDateOnlyBR(t.reference_date)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="font-mono text-sm font-medium">{t.acronym}</ResponsiveTableCell>
                    <ResponsiveTableCell className="font-mono text-sm">{t.type_code ?? "—"}</ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm">{t.description}</ResponsiveTableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ResponsiveTableWrapper>
      )}
    </LazyFiscalCard>
  );
}
