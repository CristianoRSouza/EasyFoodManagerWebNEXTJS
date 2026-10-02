import type { UnitRepository } from "../application/unit-repository";
import type { Unit } from "../domain/unit";
import { apiRequest } from "@/shared/http/api-client";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import { toUnit } from "./unit-mapper";

type Row = Record<string, unknown>;

/** Unidades de medida da loja, pela Admin API — lista curta, sem paginação nem busca no servidor. */
export class ApiUnitRepository implements UnitRepository {
  constructor(private readonly tenant: Tenant) {}

  async list(): Promise<Unit[]> {
    const response = await apiRequest<{ data: Row[] }>("/units", { tenant: this.tenant });
    return (response.data ?? []).map(toUnit);
  }
}
