import { apiRequest } from "@/shared/http/api-client";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { RuntimeInfo } from "@/shared/runtime/runtime-context";
import type {
  TotemCreateResult,
  TotemRepository,
  TotemRequeueResult,
  TotemSeriesSaveOptions,
} from "../application/totem-repository";
import type { TotemSeriesOwner } from "../domain/totem-fiscal";
import type { TotemAuditLog, TotemConfig, TotemConfigFormData, TotemLicenseSlot, TotemSeriesStatus } from "../domain/totem-config";
import type { LicenseLabelRecord } from "@/shared/license/license-labels";
import {
  toLicenseLabelRecord,
  toTotemApiBody,
  toTotemAuditLog,
  toTotemConfig,
  toTotemLicenseSlot,
  toTotemSeriesOwner,
  toTotemSeriesStatus,
} from "./totem-mapper";
import { toTotemCloudApiBody, toTotemConfigFromCloudApi } from "./totem-cloud-mapper";

type Row = Record<string, unknown>;

/** Corpo de escrita da EasyFoodAPI — mesmo tipo `Escrita` de `LEGACY/src/lib/cloud-api-data.ts`. */
type CloudWrite = { ok?: boolean; id?: string; error?: string; sync_hint?: string | null; precisa_ativar?: boolean };

/**
 * `ok: false` num 2xx é falha no cliente cloud do legado: `createTotemConfig`/`updateTotemConfig`
 * devolvem `{ ok: r.ok, error: r.error }` e a página mostra "Erro ao cadastrar/salvar". Checado
 * DEPOIS da 2ª chamada de ativação, na mesma ordem de `criarTotemApi`/`editarTotemApi` (que ativam
 * quando `precisa_ativar` e só então devolvem `r`). Ausente (`undefined`) não é falha: o legado só
 * conhece `ok` explícito no corpo; o status HTTP já cobre o resto.
 */
function assertCloudWriteOk(response: CloudWrite): void {
  if (response.ok === false) throw new Error(response.error ?? "Falha ao gravar.");
}

/**
 * Só a Admin API local conhece `transfer_series_id` (legado 1.3.13, `withTransferSeries`); os
 * modos de nuvem nunca o recebem.
 */
function withTransferSeries(body: Record<string, unknown>, opts: TotemSeriesSaveOptions): Record<string, unknown> {
  return opts.transferSeriesId ? { ...body, transfer_series_id: opts.transferSeriesId } : body;
}

/** Texto padrão do legado quando o LAN não devolve hint (`requeueLocalTotemSyncToCloud`). */
const REQUEUE_DEFAULT_HINT = "Aguarde o Sync PG-SB e vincule a licença no portal web.";

/**
 * Totens pelas rotas `/v1/totems*` (`easyfoodmanagerAPI/src/routes/v1/totems.ts`, referência LAN;
 * mesmos caminhos relativos usados pelo cliente `cloud-api-data.ts` do legado no modo Nuvem/
 * EasyFoodAPI — confirmado em `criarTotemApi`/`editarTotemApi`/`ativarTotemApi`/
 * `reenfileirarTotemApi`).
 *
 * Leitura (`list`, `availableLicenses`, `licensesForLabeling`, `auditLogs`) usa a mesma rota nos
 * dois backends; `seriesStatus` é só LAN (na nuvem devolve `[]` sem rede, como o legado). Escrita (`create`/`update`/`setActive`/`requeueSync`) também
 * funciona nos dois — o legado grava totens em modo Nuvem (`isCloudApiMode()`) desde sempre
 * (`data-service.ts#createTotemConfig`/`updateTotemConfig`/`toggleTotemActive`, ramo
 * `isCloudApiMode()`, testado ANTES do ramo Admin API/LAN) — só o CORPO da escrita difere por
 * backend:
 *
 * - `lan` (Admin API): corpo amplo (`toTotemApiBody`, porta de `totemFormDataToAdminApiBody`) —
 *   tudo MENOS os campos derivados/só-leitura; a ativação é decidida pelo próprio `is_active` no
 *   corpo, num único POST/PATCH.
 * - `cloud` (EasyFoodAPI): corpo por lista explícita (`toTotemCloudApiBody`, porta de
 *   `corpoTotem`) — o legado documenta o schema de lá como estrito. Quando a API responde
 *   `precisa_ativar: true` (totem nasce inativo e precisa da chamada de ativação separada para
 *   vincular a licença — o gatilho do banco recusa totem ativo sem licença), um segundo
 *   `PATCH .../active` é disparado, exatamente como `criarTotemApi`/`editarTotemApi` fazem.
 */
export class ApiTotemRepository implements TotemRepository {
  constructor(
    private readonly tenant: Tenant,
    private readonly backend: RuntimeInfo["backend"],
  ) {}

  async list(): Promise<TotemConfig[]> {
    const response = await apiRequest<{ data: Row[] }>("/totems", { tenant: this.tenant });
    // Mesma rota; no cloud a resposta tem o formato da EasyFoodAPI (`*_set`, chaves redigidas) —
    // traduzida como `fetchApiTotemConfigs`/`totemDaApi` do legado.
    return (response.data ?? []).map(this.backend === "cloud" ? toTotemConfigFromCloudApi : toTotemConfig);
  }

  async availableLicenses(currentTotemId: string | null): Promise<TotemLicenseSlot[]> {
    const query = currentTotemId ? `?totemId=${encodeURIComponent(currentTotemId)}` : "";
    const response = await apiRequest<{ data: Row[] }>(`/totem-available-licenses${query}`, { tenant: this.tenant });
    return (response.data ?? []).map(toTotemLicenseSlot);
  }

  async licensesForLabeling(): Promise<LicenseLabelRecord[]> {
    const response = await apiRequest<{ data: Row[] }>("/totem-licenses", { tenant: this.tenant });
    return (response.data ?? []).map(toLicenseLabelRecord);
  }

  /**
   * Só LAN. O legado (`data-service.ts#fetchTotemSeriesStatuses`) chama a rota apenas com Admin API
   * e devolve `[]` em qualquer modo de nuvem — `cloud-api-data.ts` não tem essa rota.
   */
  async seriesStatus(): Promise<TotemSeriesStatus[]> {
    if (this.backend === "cloud") return [];
    const response = await apiRequest<{ data: Row[] }>("/totems/series-status", { tenant: this.tenant });
    return (response.data ?? []).map(toTotemSeriesStatus);
  }

  /**
   * Só LAN — `fetchTotemSeriesOwner` do legado 1.3.13: com Admin API chama
   * `/v1/totems/series-owner`; fora dela (nuvem) não há o que consultar (`nfce_series_config` é
   * só local) e devolve `null`.
   */
  async seriesOwner(serie: number, environment: number, totemId: string | null): Promise<TotemSeriesOwner | null> {
    if (this.backend === "cloud") return null;
    const qs = new URLSearchParams({ serie: String(serie), environment: String(environment) });
    if (totemId) qs.set("totemId", totemId);
    const response = await apiRequest<{ data: Row | null }>(`/totems/series-owner?${qs}`, { tenant: this.tenant });
    return response.data ? toTotemSeriesOwner(response.data) : null;
  }

  async auditLogs(totemId: string): Promise<TotemAuditLog[]> {
    const response = await apiRequest<{ data: Row[] }>(`/totems/${encodeURIComponent(totemId)}/audit-logs`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toTotemAuditLog);
  }

  async create(
    data: TotemConfigFormData,
    licenseId?: string | null,
    opts: TotemSeriesSaveOptions = {},
  ): Promise<TotemCreateResult> {
    if (this.backend === "cloud") {
      const response = await apiRequest<CloudWrite>("/totems", {
        method: "POST",
        body: toTotemCloudApiBody(data, licenseId),
        tenant: this.tenant,
      });
      if (response.precisa_ativar && response.id) {
        await apiRequest(`/totems/${encodeURIComponent(response.id)}/active`, {
          method: "PATCH",
          body: { is_active: true, license_id: licenseId ?? null },
          tenant: this.tenant,
        });
      }
      assertCloudWriteOk(response);
      return { id: String(response.id ?? ""), syncHint: response.sync_hint ?? null };
    }
    const response = await apiRequest<{ id: string; sync_hint?: string | null }>("/totems", {
      method: "POST",
      body: withTransferSeries(toTotemApiBody(data, licenseId), opts),
      tenant: this.tenant,
    });
    // Legado: `sync_hint?.trim() || undefined` — hint vazio cai no texto padrão da página.
    return { id: String(response.id ?? ""), syncHint: response.sync_hint?.trim() || null };
  }

  async update(
    id: string,
    data: TotemConfigFormData,
    licenseId?: string | null,
    opts: TotemSeriesSaveOptions = {},
  ): Promise<void> {
    if (this.backend === "cloud") {
      const response = await apiRequest<CloudWrite>(`/totems/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: toTotemCloudApiBody(data, licenseId),
        tenant: this.tenant,
      });
      if (response.precisa_ativar) {
        await apiRequest(`/totems/${encodeURIComponent(id)}/active`, {
          method: "PATCH",
          body: { is_active: true, license_id: licenseId ?? null },
          tenant: this.tenant,
        });
      }
      assertCloudWriteOk(response);
      return;
    }
    await apiRequest(`/totems/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: withTransferSeries(toTotemApiBody(data, licenseId), opts),
      tenant: this.tenant,
    });
  }

  async setActive(id: string, isActive: boolean, licenseId: string | null): Promise<void> {
    await apiRequest(`/totems/${encodeURIComponent(id)}/active`, {
      method: "PATCH",
      body: { is_active: isActive, license_id: licenseId },
      tenant: this.tenant,
    });
  }

  /**
   * `POST /totems/:id/requeue-cloud-sync` — mesma rota nos dois backends, mas o LEGADO chama
   * clientes diferentes por trás dela conforme o modo (`requeueLocalTotemSyncToCloud`, Admin API,
   * no LAN; `reenfileirarTotemApi`, EasyFoodAPI, na nuvem) e as respostas TÊM FORMAS DIFERENTES:
   * o LAN devolve `{outbox_inserted, licenses_requeued, sync_hint}` (outbox PG→nuvem); a nuvem
   * devolve só `{licenses_requeued}` (é a RPC de reentrega nuvem→PG local, sem outbox/hint). Os
   * campos ausentes do lado cloud ficam com o default neutro (`outboxInserted: true`, `syncHint:
   * ""`, `syncDiagnostics: null`) — quem usa o resultado (`use-totems-page.ts#handleRequeueSync`)
   * escolhe o texto do toast pelo `backend`, não por estes campos.
   *
   * No LAN, os fallbacks são os de `requeueLocalTotemSyncToCloud` (`data-service.ts`):
   * `outbox_inserted !== false`, `sync_hint?.trim() || hint_pt || texto padrão`, e sem
   * `sync_diagnostics` o default "start_sync_service"/"não está rodando".
   */
  async requeueSync(id: string): Promise<TotemRequeueResult> {
    if (this.backend === "cloud") {
      const response = await apiRequest<{ licenses_requeued?: number }>(
        `/totems/${encodeURIComponent(id)}/requeue-cloud-sync`,
        { method: "POST", tenant: this.tenant },
      );
      return {
        outboxInserted: true,
        licensesRequeued: Number(response.licenses_requeued ?? 0),
        syncHint: "",
        syncDiagnostics: null,
      };
    }
    const response = await apiRequest<{
      outbox_inserted?: boolean;
      licenses_requeued?: number;
      sync_hint?: string | null;
      sync_diagnostics?: { recommendation?: string; sync_service_likely_running?: boolean; hint_pt?: string | null } | null;
    }>(`/totems/${encodeURIComponent(id)}/requeue-cloud-sync`, { method: "POST", tenant: this.tenant });
    const diag = response.sync_diagnostics ?? null;
    return {
      outboxInserted: response.outbox_inserted !== false,
      licensesRequeued: Number(response.licenses_requeued ?? 0),
      syncHint: response.sync_hint?.trim() || diag?.hint_pt || REQUEUE_DEFAULT_HINT,
      syncDiagnostics: diag
        ? { recommendation: String(diag.recommendation ?? ""), syncServiceLikelyRunning: diag.sync_service_likely_running === true }
        : { recommendation: "start_sync_service", syncServiceLikelyRunning: false },
    };
  }
}
