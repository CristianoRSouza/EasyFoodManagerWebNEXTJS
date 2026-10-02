import type { BillingRepository } from "./billing-repository";
import { toLicenseStatus, type LicenseStatus } from "./license-status";
import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import type { TenantHeaders } from "@/shared/http/api-client";

/** Billing pela EasyFoodAPI, através do repasse `/api/v1`: empresa (e a loja, se houver) nos cabeçalhos. */
export class ApiBillingRepository implements BillingRepository {
  constructor(private readonly tenant: TenantHeaders) {}

  async licenseStatus(): Promise<LicenseStatus> {
    const response = await apiRequest<Envelope<unknown> | null>("/billing/license", { tenant: this.tenant });
    return toLicenseStatus(response?.data);
  }
}
