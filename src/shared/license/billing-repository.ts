import type { LicenseStatus } from "./license-status";

/** Licença da empresa ativa (`LEGACY/src/lib/cloud-api-billing.ts`). Só nuvem. */
export interface BillingRepository {
  licenseStatus(): Promise<LicenseStatus>;
}
