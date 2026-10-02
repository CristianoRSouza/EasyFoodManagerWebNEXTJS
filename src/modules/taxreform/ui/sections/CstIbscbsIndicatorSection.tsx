"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsCstIbscbsIndicator } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";
import { boolBadge } from "../bool-badge";
import { indicadorLigado } from "@/shared/domain/ibscbs-indicator";

/** Indicadores CST IBS/CBS — sem filtro por ano (sem coluna de vigência). */
export function CstIbscbsIndicatorSection({ yearBadge, refreshKey }: Pick<FiscalSectionProps, "yearBadge" | "refreshKey">) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsCstIbscbsIndicator[]>([]);

  return (
    <LazyFiscalCard
      key={`cstind-${refreshKey}`}
      icon={<Hash className="h-4 w-4 text-primary" />}
      title="Indicadores CST IBS/CBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchCstIbscbsIndicator(300));
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum indicador CST IBS/CBS encontrado</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="24rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CST</TableHead>
                <TableHead className="text-center">IBS/CBS</TableHead>
                <TableHead className="text-center">Monofásico</TableHead>
                <TableHead className="text-center">Redução</TableHead>
                <TableHead className="text-center">Diferencial</TableHead>
                <TableHead className="text-center">Transf. Créd.</TableHead>
                <TableHead className="text-center">Pres. ZFM</TableHead>
                <TableHead className="text-center">Aj. Compet.</TableHead>
                <TableHead className="text-center">NFe</TableHead>
                <TableHead className="text-center">NFCe</TableHead>
                <TableHead className="text-center">CTe</TableHead>
                <TableHead className="text-center">NFSe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.cst_code}>
                  <ResponsiveTableCell className="font-mono text-sm font-medium">{c.cst_code}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_ibscbs))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_ibscbs_monophasic))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_reduction))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_differential))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_credit_transfer))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_presumed_zfm))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.group_competence_adjust))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.allows_nfe))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.allows_nfce))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.allows_cte))}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-center">{boolBadge(indicadorLigado(c.allows_nfse))}</ResponsiveTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableWrapper>
      )}
    </LazyFiscalCard>
  );
}
