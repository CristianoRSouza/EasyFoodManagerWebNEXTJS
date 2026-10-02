"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsTaxClassIbscbsIndicator } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";
import { boolBadge } from "../bool-badge";
import { indicadorLigado } from "@/shared/domain/ibscbs-indicator";

/** Indicadores da Classificação Tributária IBS/CBS — sem filtro por ano (sem coluna de vigência). */
export function TaxClassIbscbsIndicatorSection({ yearBadge, refreshKey }: Pick<FiscalSectionProps, "yearBadge" | "refreshKey">) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsTaxClassIbscbsIndicator[]>([]);

  return (
    <LazyFiscalCard
      key={`taxclassind-${refreshKey}`}
      icon={<Hash className="h-4 w-4 text-primary" />}
      title="Indicadores Classificação Tributária IBS/CBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchTaxClassIbscbsIndicator(300));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum indicador de classificação encontrado</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód. Classe</TableHead>
                <TableHead className="text-right">Pts Red. IBS</TableHead>
                <TableHead className="text-right">Pts Red. CBS</TableHead>
                <TableHead>Red. Base Cálculo</TableHead>
                <TableHead>Grupo Trib. Regular</TableHead>
                <TableHead>Grupo Créd. Presumido</TableHead>
                <TableHead>Grupo Mono. Padrão</TableHead>
                <TableHead>Grupo Mono. Retenção</TableHead>
                <TableHead>Grupo Mono. Subst.</TableHead>
                <TableHead>Grupo Mono. Dif.</TableHead>
                <TableHead>Grupo Rev. Crédito</TableHead>
                <TableHead>Obs. Créd. Destinat.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t, i) => (
                <TableRow key={`${t.class_code}-${i}`}>
                  <ResponsiveTableCell className="font-mono text-sm">{t.class_code}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-right font-mono text-sm">{t.ibs_reduction_points ?? "—"}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-right font-mono text-sm">{t.cbs_reduction_points ?? "—"}</ResponsiveTableCell>
                  {/* Loja manda "0"/"1" (e vazio no redutor); nuvem manda 'S'/null e boolean.
                      `indicadorLigado` normaliza os dois — ausência é "não participa" (legado 1.3.12, PR #43). */}
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.reduces_tax_base))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.regular_taxation_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.presumed_credit_op_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.monophasic_standard_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.monophasic_withholding_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.monophasic_substitution_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.monophasic_diff_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(t.credit_reversal_group))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="max-w-[180px] truncate text-sm" title={t.credit_recipient_notes ?? ""}>
                    {t.credit_recipient_notes ?? "—"}
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
