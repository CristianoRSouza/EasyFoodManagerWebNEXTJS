"use client";

import { useCallback, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { NfceIssuerSectionNav } from "@/shared/ui/issuer-sections/NfceIssuerSectionNav";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { useToast } from "@/shared/ui/use-toast";
import { matchesYear as checkMatchesYear, yearFilterOptions } from "../domain/year-filter";
import { DatasetVersionSection } from "./sections/DatasetVersionSection";
import { UnionRateSection } from "./sections/UnionRateSection";
import { StateRatesSection } from "./sections/StateRatesSection";
import { MunicipalityRatesSection } from "./sections/MunicipalityRatesSection";
import { IbscbsTypesSection } from "./sections/IbscbsTypesSection";
import { TaxClassIbscbsSection } from "./sections/TaxClassIbscbsSection";
import { TaxClassIbscbsIndicatorSection } from "./sections/TaxClassIbscbsIndicatorSection";
import { LegalBasisSection } from "./sections/LegalBasisSection";
import { CstIbscbsIndicatorSection } from "./sections/CstIbscbsIndicatorSection";
import { CstIbscbsSection } from "./sections/CstIbscbsSection";

/**
 * Configuração fiscal (`/nfce-issuer-fiscal`) — parte 2/2 do Emitente NFC-e: as 11 tabelas de
 * referência CBS/IBS da reforma tributária (o legado 1.3.12 tirou o card de Crédito Presumido —
 * PR #44 — e os três do Imposto Seletivo — PR #46), cada uma num card que carrega ao rolar a página
 * (`LazyFiscalCard`). Cópia visual de `NfceIssuerFiscalPage.tsx` do legado; cada seção virou um
 * componente próprio do módulo para não concentrar as 15 tabelas num arquivo só.
 */
export function TaxReformFiscalPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>(String(currentYear));

  const matchesYear = useCallback(
    (dateFields: Array<string | null | undefined>) => checkMatchesYear(filterYear, dateFields),
    [filterYear],
  );

  const yearBadge = useMemo(
    () => (
      <Badge variant="outline" className="ml-1 text-xs font-normal">
        <Calendar className="mr-1 h-3 w-3" />
        {filterYear === "all" ? "Todos" : filterYear}
      </Badge>
    ),
    [filterYear],
  );

  const yearOptions = useMemo(() => yearFilterOptions(currentYear), [currentYear]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Recarregando", description: "Todas as seções serão recarregadas ao rolar." });
  }, [toast]);

  return (
    <div className="space-y-6">
      <NfceIssuerSectionNav
        active="fiscal"
        description="Parte 2 de 2 · Cada seção carrega individualmente ao rolar a página."
        actions={<PageRefreshButton onClick={handleRefresh} refreshing={false} />}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-medium">Filtrar por ano de vigência:</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterYear !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setFilterYear("all")} className="text-xs">
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      <DatasetVersionSection yearBadge={yearBadge} refreshKey={refreshKey} />
      <UnionRateSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <StateRatesSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <MunicipalityRatesSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <IbscbsTypesSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <TaxClassIbscbsSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <TaxClassIbscbsIndicatorSection yearBadge={yearBadge} refreshKey={refreshKey} />
      <LegalBasisSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
      <CstIbscbsIndicatorSection yearBadge={yearBadge} refreshKey={refreshKey} />
      <CstIbscbsSection matchesYear={matchesYear} yearBadge={yearBadge} refreshKey={refreshKey} />
    </div>
  );
}
