import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { RevenueReportParams, RevenueRepository } from "../application/revenue-repository";
import { withVoucherDefaults, type RevenueReport } from "../domain/revenue";

/**
 * `GET /dashboard/revenue-approved` — mesmo endpoint e mesmos parâmetros que o legado usa no
 * modo LAN (`src/lib/admin-api-client.ts` → `fetchRevenueApproved`). O servidor já devolve os
 * agregados prontos (somas por método/dia/hora/totem/produto/mês); o cliente só decide o que
 * exibir e ordenar.
 */
export class ApiRevenueRepository implements RevenueRepository {
  constructor(private readonly tenant: Tenant) {}

  async report(params: RevenueReportParams): Promise<RevenueReport> {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      recentOffset: String(params.recentOffset),
      recentLimit: String(params.recentLimit),
    });
    const response = await apiRequest<Envelope<RevenueReport>>(`/dashboard/revenue-approved?${qs.toString()}`, {
      tenant: this.tenant,
    });
    // Servidor anterior ao voucher não manda os campos — completa com zero em vez de NaN (legado 1.3.12).
    return withVoucherDefaults(response.data);
  }
}
