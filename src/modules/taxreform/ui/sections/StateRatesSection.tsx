"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { formatDateTime } from "@/shared/format/date-time";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsState, CbsStateReferenceRate } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

interface StateRateRow {
  state: CbsState;
  rate: CbsStateReferenceRate | undefined;
}

/** Estados CBS com as alíquotas de referência — junção feita no cliente, como no legado. */
export function StateRatesSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const [states, setStates] = useState<CbsState[]>([]);
  const [rates, setRates] = useState<CbsStateReferenceRate[]>([]);

  const rows = states.flatMap((state): StateRateRow[] => {
    const stateRates = rates.filter((rate) => String(rate.state_code) === String(state.code));
    if (stateRates.length === 0) {
      return matchesYear([]) ? [{ state, rate: undefined }] : [];
    }
    return stateRates
      .filter((rate) => matchesYear([rate.reference_date, rate.valid_from, rate.valid_to]))
      .map((rate) => ({ state, rate }));
  });

  return (
    <LazyFiscalCard
      key={`states-rates-${refreshKey}`}
      icon={<MapPin className="h-5 w-5 text-primary" />}
      title="Estados CBS — Alíquotas"
      titleBadge={yearBadge}
      fetchData={async () => {
        const [statesResult, ratesResult] = await Promise.all([
          repository.fetchState(),
          repository.fetchStateReferenceRate(undefined, 300),
        ]);
        setStates(statesResult);
        setRates(ratesResult);
      }}
    >
      {states.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum estado encontrado</p>
      ) : (
        <ResponsiveTableWrapper maxHeight="32rem">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Nome</TableHead>
                <ResponsiveTableHead hideBelow="md">Data Ref.</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="sm">Vigência Início</ResponsiveTableHead>
                <ResponsiveTableHead hideBelow="md">Vigência Fim</ResponsiveTableHead>
                <TableHead>Alíq. Referência</TableHead>
                <TableHead>Alíq. Própria</TableHead>
                <ResponsiveTableHead hideBelow="lg">Atualizado</ResponsiveTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ state: s, rate }, i) => (
                <TableRow key={`${s.code}-${rate?.reference_date}-${i}`}>
                  <ResponsiveTableCell className="font-mono text-sm font-medium">{s.code}</ResponsiveTableCell>
                  <ResponsiveTableCell>
                    <Badge variant="outline">{s.abbreviation}</Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell className="text-sm">{s.name}</ResponsiveTableCell>
                  <ResponsiveTableCell hideBelow="md" className="text-sm">
                    {rate?.reference_date ? formatDateOnlyBR(rate.reference_date) : "—"}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell hideBelow="sm" className="text-sm">
                    {rate?.valid_from ? formatDateOnlyBR(rate.valid_from) : "—"}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell hideBelow="md" className="text-sm">
                    {rate?.valid_to ? formatDateOnlyBR(rate.valid_to) : "—"}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell className="text-sm">
                    {rate?.reference_rate != null ? `${rate.reference_rate}%` : "—"}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell className="text-sm">
                    {rate?.own_rate != null ? `${rate.own_rate}%` : "—"}
                  </ResponsiveTableCell>
                  <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                    {rate?.updated_at ? formatDateTime(rate.updated_at) : s.updated_at ? formatDateTime(s.updated_at) : "—"}
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
