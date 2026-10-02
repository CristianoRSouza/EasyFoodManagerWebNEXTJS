import type { BootstrapCodeRepository } from "../application/bootstrap-code-repository";
import type { IssueBootstrapCodeInput, IssueBootstrapCodeResult } from "../domain/bootstrap-code";
import { normalizeBootstrapEmail } from "../domain/bootstrap-code";
import { apiRequest } from "@/shared/http/api-client";
import { ApiError } from "@/shared/http/api-error";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import { toIssueBootstrapCodeResult, type BootstrapCodeApiRow } from "./bootstrap-code-mapper";

/**
 * Emissão de código de primeiro acesso pela EasyFoodAPI — o repasse `/api/v1/stores/{storeId}/
 * bootstrap-code` do Next (rota genérica em `src/app/api/v1/[...path]/route.ts`, não tocada
 * aqui). É o mesmo caminho que `LEGACY/src/lib/issue-bootstrap-code.ts` usa quando
 * `isCloudApiMode()` é verdadeiro — o Next não tem (e não pode ter) o outro caminho do legado,
 * que chama a edge function `issue-bootstrap-code` do Supabase direto do navegador.
 *
 * A loja vai no CAMINHO (não no corpo), como no legado: é ela que o servidor confere contra o
 * dono da sessão antes de assinar qualquer coisa.
 */
export class ApiBootstrapCodeRepository implements BootstrapCodeRepository {
  constructor(private readonly tenant: Tenant) {}

  async issue(input: IssueBootstrapCodeInput): Promise<IssueBootstrapCodeResult> {
    try {
      const response = await apiRequest<BootstrapCodeApiRow>(
        `/stores/${encodeURIComponent(this.tenant.storeId)}/bootstrap-code`,
        {
          method: "POST",
          body: {
            email: normalizeBootstrapEmail(input.email),
            ...(input.ttlHours ? { ttl_hours: input.ttlHours } : {}),
          },
          tenant: this.tenant,
        },
      );
      return toIssueBootstrapCodeResult(response);
    } catch (error) {
      // Mesmo contrato do legado: esta função nunca lança — quem chama mostra `error` na tela.
      return { ok: false, error: error instanceof ApiError ? error.message : "Falha ao gerar o código." };
    }
  }
}
