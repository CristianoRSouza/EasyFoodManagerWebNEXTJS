"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Input } from "@/shared/ui/primitives/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { ResponsiveTableWrapper, ResponsiveTableCell, ResponsiveTableHead } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { LazyFiscalCard } from "@/shared/ui/issuer-sections/LazyFiscalCard";
import { useToast } from "@/shared/ui/use-toast";
import { formatDateTime } from "@/shared/format/date-time";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { useTaxReformRepository } from "../use-tax-reform-repository";
import type { CbsMunicipalityWithRate } from "../../domain/cbs-reference-data";
import type { FiscalSectionProps } from "../fiscal-section-props";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** Municípios CBS com alíquotas IBS — combo de UF, carga sob demanda (não paginada por padrão). */
export function MunicipalityRatesSection({ matchesYear, yearBadge, refreshKey }: FiscalSectionProps) {
  const repository = useTaxReformRepository();
  const { toast } = useToast();
  const [selectedUf, setSelectedUf] = useState("");
  const [rows, setRows] = useState<CbsMunicipalityWithRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const handleUfChange = async (uf: string) => {
    setSelectedUf(uf);
    setLoading(true);
    setRows([]);
    try {
      const results = await repository.fetchMunicipalityWithRateByUf(uf);
      setRows(results);
      if (results.length === 0) {
        toast({ title: "Nenhum município", description: `Nenhum município encontrado para UF "${uf}"` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? rows.filter(
        (m) => m.name?.toLowerCase().includes(search.trim().toLowerCase()) || String(m.code).includes(search.trim()),
      )
    : rows;

  return (
    <LazyFiscalCard
      key={`mun-uf-${refreshKey}`}
      eager
      icon={<MapPin className="h-4 w-4 text-primary" />}
      title="Municípios CBS — Alíquotas IBS"
      titleBadge={yearBadge}
      fetchData={async () => {}}
    >
      <div className="p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Selecione o estado:</span>
          <Select value={selectedUf} onValueChange={handleUfChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="UF..." />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 flex-wrap">
            {loading && <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>}
            {rows.length > 0 && <Badge variant="secondary">{rows.length} municípios</Badge>}
          </div>
        </div>
        {selectedUf && rows.length > 0 && (
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-xs"
            />
          </div>
        )}
        {!selectedUf ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Selecione uma UF para carregar os municípios e alíquotas</p>
        ) : rows.length === 0 && !loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum município encontrado para {selectedUf}</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum município corresponde à busca &quot;{search}&quot;</p>
        ) : (
          <ResponsiveTableWrapper maxHeight="28rem">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código IBGE</TableHead>
                  <TableHead>Município</TableHead>
                  <ResponsiveTableHead hideBelow="md">Data Ref.</ResponsiveTableHead>
                  <ResponsiveTableHead hideBelow="sm">Vigência De</ResponsiveTableHead>
                  <ResponsiveTableHead hideBelow="md">Vigência Até</ResponsiveTableHead>
                  <TableHead className="text-right">Alíq. Referência</TableHead>
                  <TableHead className="text-right">Alíq. Própria</TableHead>
                  <ResponsiveTableHead hideBelow="lg">Atualizado</ResponsiveTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .filter((m) => matchesYear([m.reference_date, m.valid_from, m.valid_to]))
                  .map((m, i) => (
                    <TableRow key={`${m.code}-${m.reference_date}-${i}`}>
                      <ResponsiveTableCell className="font-mono text-sm font-medium">{m.code}</ResponsiveTableCell>
                      <ResponsiveTableCell className="text-sm">{m.name}</ResponsiveTableCell>
                      <ResponsiveTableCell hideBelow="md" className="text-sm">
                        {m.reference_date ? formatDateOnlyBR(m.reference_date) : "—"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell hideBelow="sm" className="text-sm">
                        {m.valid_from ? formatDateOnlyBR(m.valid_from) : "—"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell hideBelow="md" className="text-sm">
                        {m.valid_to ? formatDateOnlyBR(m.valid_to) : "—"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-right font-mono text-sm">
                        {m.reference_rate != null ? `${Number(m.reference_rate).toFixed(4)}%` : "—"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-right font-mono text-sm">
                        {m.own_rate_mun != null ? `${Number(m.own_rate_mun).toFixed(4)}%` : "—"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground">
                        {m.rate_updated_at ? formatDateTime(m.rate_updated_at) : m.updated_at ? formatDateTime(m.updated_at) : "—"}
                      </ResponsiveTableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ResponsiveTableWrapper>
        )}
      </div>
    </LazyFiscalCard>
  );
}
