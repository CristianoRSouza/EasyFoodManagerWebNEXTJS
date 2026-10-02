"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, FileText, Loader2, Percent, Receipt, Scale, Shield } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Separator } from "@/shared/ui/primitives/separator";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useProductRepository } from "./use-product-repository";
import { FiscalDetail, FiscalSection, fmtNcmAliquota } from "./FiscalDetail";
import { formatDateOnlyBR } from "@/shared/format/date-only";
import { fmtFiscalNum } from "../domain/fiscal-number";

/** Indicador já normalizado no mapper (`indicadorLigado`) — legado 1.3.12, PR #32. */
const simNao = (ligado: boolean): "Sim" | "Não" => (ligado ? "Sim" : "Não");

export function ProductFiscalDetails({ productId }: { productId: string }) {
  const tenant = useRequiredTenant();
  const repository = useProductRepository();
  const { backend } = useRuntime();

  const fiscalQuery = useQuery({
    // O tenant entra na chave para não misturar, no cache, o cadastro fiscal de outra empresa
    // com o mesmo `productId`/`classCode` ao trocar de empresa na nuvem.
    queryKey: ["product-fiscal", tenant.companyId, tenant.storeId, productId],
    queryFn: () => repository.fiscal(productId),
  });

  const classCode = fiscalQuery.data?.taxReform.taxClassCode ?? null;
  const ibsCbsQuery = useQuery({
    queryKey: ["product-fiscal-ibscbs", tenant.companyId, tenant.storeId, classCode],
    // `enabled` garante `classCode` não-nulo aqui.
    queryFn: () => repository.fiscalIbsCbs(classCode as string),
    enabled: classCode != null,
  });

  if (fiscalQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Carregando dados fiscais…</span>
      </div>
    );
  }

  if (fiscalQuery.isError) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <Shield className="h-6 w-6 text-destructive/60" />
        <p className="text-sm text-destructive">Erro ao carregar dados fiscais</p>
      </div>
    );
  }

  const fiscal = fiscalQuery.data;
  if (!fiscal) {
    const cloud = backend === "cloud";
    return (
      <div className="flex flex-col items-center py-8 gap-2 text-center">
        {cloud ? (
          <>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
              Dados fiscais não disponíveis na nuvem
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              Os campos fiscais detalhados (NCM, ICMS, PIS/COFINS, IBS/CBS) ainda não estão mapeados para a
              EasyFoodAPI. Disponíveis apenas no modo loja (LAN).
            </p>
          </>
        ) : (
          <>
            <FileText className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Dados fiscais não cadastrados para este produto</p>
          </>
        )}
      </div>
    );
  }

  const tc = ibsCbsQuery.data?.taxClass;
  const ind = ibsCbsQuery.data?.indicator;
  const { identification, icms, pis, cofins, taxReform } = fiscal;

  return (
    <div className="p-5 space-y-4">
      {/* Header with quick summary badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="text-xs gap-1 bg-primary/5 border-primary/20 text-primary">
          NCM {identification.ncm || "—"}
        </Badge>
        {identification.cest && (
          <Badge variant="outline" className="text-xs gap-1 bg-muted">
            CEST {identification.cest}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs gap-1 bg-muted">
          CFOP {identification.cfop || "—"}
        </Badge>
        {icms.originState && (
          <Badge variant="outline" className="text-xs gap-1 bg-muted">
            UF {icms.originState}
          </Badge>
        )}
        {taxReform.taxClassCode && (
          <Badge variant="outline" className="text-xs gap-1 bg-accent/10 border-accent/20 text-accent-foreground">
            IBS/CBS {taxReform.taxClassCode}
          </Badge>
        )}
      </div>

      <Separator className="opacity-40" />

      {/* Fiscal sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Classificação Fiscal */}
        <FiscalSection icon={<FileText className="h-3.5 w-3.5 text-primary" />} title="Classificação Fiscal">
          <FiscalDetail label="NCM" value={identification.ncm} highlight />
          <FiscalDetail label="Alíq. NCM nacional (IBPT)" value={fmtNcmAliquota(taxReform.nationalRate)} />
          <FiscalDetail label="Alíq. NCM importado" value={fmtNcmAliquota(taxReform.importedRate)} />
          <FiscalDetail label="Alíq. NCM estadual" value={fmtNcmAliquota(taxReform.stateRate)} />
          <FiscalDetail label="CEST" value={identification.cest} />
          <FiscalDetail label="CFOP" value={identification.cfop} highlight />
          <FiscalDetail label="Descrição CFOP" value={identification.cfopDescription} />
          <FiscalDetail
            label="Entrada/Saída"
            value={
              identification.cfopEntryExit === "S" ? "Saída" : identification.cfopEntryExit === "E" ? "Entrada" : identification.cfopEntryExit
            }
          />
          <FiscalDetail label="Unidade Fiscal" value={identification.fiscalUnit} />
          <FiscalDetail label="Regra Tributária" value={identification.taxRuleDescription} />
          <FiscalDetail label="UF Origem" value={icms.originState} />
          <FiscalDetail label="Revendedor" value={icms.resellerFlag === "S" ? "Sim" : icms.resellerFlag === "N" ? "Não" : icms.resellerFlag} />
        </FiscalSection>

        {/* ICMS */}
        <FiscalSection icon={<Receipt className="h-3.5 w-3.5 text-primary" />} title="ICMS">
          <FiscalDetail label="Origem" value={icms.origin != null ? String(icms.origin) : null} />
          <FiscalDetail label="CST ICMS" value={icms.cst} />
          <FiscalDetail label="CSOSN" value={icms.csosn} highlight />
          <FiscalDetail label="Descrição" value={icms.description} />
          <FiscalDetail label="Alíquota" value={fmtFiscalNum(icms.rate, 2, "%")} />
          <FiscalDetail label="Alíquota FE" value={fmtFiscalNum(icms.rateFundoPobreza, 2, "%")} />
          <FiscalDetail label="Crédito SN" value={fmtFiscalNum(icms.creditRateSimples, 2, "%")} />
          <FiscalDetail label="Redução BC" value={fmtFiscalNum(icms.reductionPercent, 2, "%")} />
          <FiscalDetail label="ICMS ST Alíq." value={fmtFiscalNum(icms.substitutionRate, 2, "%")} />
          <FiscalDetail label="ICMS ST FE" value={fmtFiscalNum(icms.substitutionRateFundoPobreza, 2, "%")} />
          <FiscalDetail label="MVA ST" value={fmtFiscalNum(icms.substitutionMargin, 2, "%")} />
          <FiscalDetail label="Tipo ICMS" value={icms.type} />
          <FiscalDetail label="IPI Sit. Trib." value={identification.ipiTaxSituation} />
          <FiscalDetail label="Cód. Benefício" value={identification.taxBenefitCode} />
        </FiscalSection>

        {/* PIS / COFINS */}
        <FiscalSection icon={<Percent className="h-3.5 w-3.5 text-primary" />} title="PIS / COFINS">
          <FiscalDetail label="CST PIS" value={pis.cst} highlight />
          <FiscalDetail label="PIS Descrição" value={pis.description} />
          <FiscalDetail label="PIS Alíquota" value={fmtFiscalNum(pis.rate, 2, "%")} />
          <FiscalDetail label="PIS Vlr. Alíq." value={fmtFiscalNum(pis.rateValue, 4)} />
          <FiscalDetail label="PIS Tipo Cálc." value={pis.calculationType} />
          <Separator className="opacity-30 !my-1" />
          <FiscalDetail label="CST COFINS" value={cofins.cst} highlight />
          <FiscalDetail label="COFINS Descrição" value={cofins.description} />
          <FiscalDetail label="COFINS Alíquota" value={fmtFiscalNum(cofins.rate, 2, "%")} />
          <FiscalDetail label="COFINS Vlr. Alíq." value={fmtFiscalNum(cofins.rateValue, 4)} />
          <FiscalDetail label="COFINS Tipo Cálc." value={cofins.calculationType} />
        </FiscalSection>

        {/* IBS / CBS */}
        <FiscalSection icon={<Scale className="h-3.5 w-3.5 text-primary" />} title="IBS / CBS">
          <FiscalDetail label="Cód. Classificação" value={taxReform.taxClassCode} highlight />
          {tc ? (
            <>
              <FiscalDetail label="Descrição" value={tc.description} />
              <FiscalDetail label="Tipo Alíquota" value={tc.rateType} />
              <FiscalDetail label="Tratamento Trib." value={tc.taxTreatmentDescription} />
              <FiscalDetail label="% Red. CBS" value={tc.cbsReductionPercent != null ? `${tc.cbsReductionPercent.toFixed(2)}%` : null} />
              <FiscalDetail
                label="% Red. IBS UF"
                value={tc.ibsStateReductionPercent != null ? `${tc.ibsStateReductionPercent.toFixed(2)}%` : null}
              />
              <FiscalDetail
                label="% Red. IBS Mun."
                value={tc.ibsMunicipalityReductionPercent != null ? `${tc.ibsMunicipalityReductionPercent.toFixed(2)}%` : null}
              />
              <FiscalDetail label="Vigência De" value={tc.validFrom ? formatDateOnlyBR(tc.validFrom) : null} />
              <FiscalDetail label="Vigência Até" value={tc.validTo ? formatDateOnlyBR(tc.validTo) : null} />
            </>
          ) : taxReform.taxClassCode ? (
            <p className="text-xs text-muted-foreground italic py-2">Classificação não encontrada</p>
          ) : (
            <p className="text-xs text-muted-foreground italic py-2">Não classificado</p>
          )}
          {ind && (
            <>
              <Separator className="opacity-30 !my-1" />
              <div className="py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" /> Indicadores
                </span>
              </div>
              <FiscalDetail label="Pts Red. IBS" value={ind.ibsReductionPoints ?? null} />
              <FiscalDetail label="Pts Red. CBS" value={ind.cbsReductionPoints ?? null} />
              <FiscalDetail
                label="Red. Base Cálc."
                value={
                  <Badge variant={ind.reducesTaxBase ? "default" : "secondary"} className="text-[10px] h-5">
                    {simNao(ind.reducesTaxBase)}
                  </Badge>
                }
              />
              <FiscalDetail label="Trib. Regular" value={simNao(ind.regularTaxationGroup)} />
              <FiscalDetail label="Créd. Presumido" value={simNao(ind.presumedCreditOpGroup)} />
              <FiscalDetail label="Monofásico" value={simNao(ind.monophasicStandardGroup)} />
              <FiscalDetail label="Reversão Créd." value={simNao(ind.creditReversalGroup)} />
            </>
          )}
        </FiscalSection>
      </div>
    </div>
  );
}
