"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { UNKNOWN_LICENSE, type LicenseStatus } from "./license-status";
import { ApiBillingRepository } from "./api-billing-repository";

/**
 * Estado da licença da empresa selecionada (`useLicenseStatus` do legado).
 *
 * Por EMPRESA, como o legado (`queryKey: ["license-status", selectedCompanyId]`): consulta assim
 * que há empresa escolhida — inclusive na escolha de loja com uma empresa só — e trocar de loja na
 * mesma empresa não consulta de novo. Os cabeçalhos são os do cliente do legado: `x-company-id`
 * sempre, `x-store-id` só quando já há loja.
 *
 * Usa `useTenant` (e não `useRequiredTenant`): a faixa e o cabeçalho vivem FORA do bloqueio de
 * loja do layout. Licença é conceito só da nuvem: na loja (LAN) nunca consulta (`cloudActive`).
 */
export function useLicenseStatus(): UseQueryResult<LicenseStatus> {
  const { backend } = useRuntime();
  const { selection, selectedCompany } = useTenant();
  const companyId = selectedCompany?.id ?? selection?.companyId ?? null;
  const storeId = selection?.companyId === companyId ? selection?.storeId ?? null : null;
  return useQuery<LicenseStatus>({
    queryKey: ["license-status", companyId],
    enabled: backend === "cloud" && Boolean(companyId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: () => (companyId ? new ApiBillingRepository({ companyId, storeId }).licenseStatus() : Promise.resolve(UNKNOWN_LICENSE)),
  });
}
