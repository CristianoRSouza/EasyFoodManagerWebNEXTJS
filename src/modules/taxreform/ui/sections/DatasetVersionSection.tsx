"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateTime } from "@/shared/format/date-time";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsOpenDatasetVersion } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

/** Versão do dataset CBS/IBS — card eager (leve, sem paginação). Sem filtro por ano. */
export function DatasetVersionSection({ yearBadge, refreshKey }: Pick<FiscalSectionProps, "yearBadge" | "refreshKey">) {
  const repository = useTaxReformRepository();
  const [rows, setRows] = useState<CbsOpenDatasetVersion[]>([]);

  return (
    <LazyFiscalCard
      key={`dataset-${refreshKey}`}
      eager
      icon={<Settings2 className="h-4 w-4 text-primary" />}
      title="Versão Dataset CBS/IBS"
      titleBadge={yearBadge}
      fetchData={async () => {
        setRows(await repository.fetchOpenDatasetVersion());
      }}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma versão de dataset encontrada</p>
      ) : (
        <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Versão App</TableHead>
                <TableHead>Versão DB</TableHead>
                <ResponsiveTableHead hideBelow="lg">Atualizado em</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <ResponsiveTableCell className="font-mono text-sm">{d.id}</ResponsiveTableCell>
                  <ResponsiveTableCell className="text-sm">{d.dataset_description}</ResponsiveTableCell>
                  <ResponsiveTableCell className="font-mono text-xs">{d.provider_app_version}</ResponsiveTableCell>
                  <ResponsiveTableCell className="font-mono text-xs font-medium">{d.provider_db_version}</ResponsiveTableCell>
                  <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                    {formatDateTime(d.updated_at)}
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
