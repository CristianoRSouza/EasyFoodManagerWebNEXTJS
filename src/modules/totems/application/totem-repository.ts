import type { LicenseLabelRecord } from "@/shared/license/license-labels";
import type { TotemAuditLog, TotemConfig, TotemConfigFormData, TotemLicenseSlot, TotemSeriesStatus } from "../domain/totem-config";
import type { TotemSeriesOwner } from "../domain/totem-fiscal";

/**
 * Confirmação de transferência da série NFC-e (`series_id` do dono, vindo de `seriesOwner`) —
 * `TotemSeriesSaveOptions` do legado 1.3.13 (PR #56).
 */
export type TotemSeriesSaveOptions = { transferSeriesId?: string | null };

export interface TotemCreateResult {
  id: string;
  syncHint: string | null;
}

/**
 * Parte de `sync_diagnostics` (resposta LAN de `requeue-cloud-sync`) que a tela usa para decidir o
 * toast "inicie o Sync PG-SB" (`TotemConfigPage.tsx#handleRequeueSync` do legado).
 */
export interface TotemRequeueSyncDiagnostics {
  recommendation: string;
  syncServiceLikelyRunning: boolean;
}

export interface TotemRequeueResult {
  outboxInserted: boolean;
  licensesRequeued: number;
  syncHint: string;
  /** Só no LAN (outbox PG→nuvem); `null` na nuvem, cuja RPC não devolve diagnóstico. */
  syncDiagnostics: TotemRequeueSyncDiagnostics | null;
}

/**
 * Porta das operações de Totens (`GET/POST/PATCH /v1/totems*`,
 * `easyfoodmanagerAPI/src/routes/v1/totems.ts`) — leitura e escrita funcionam nos dois backends,
 * igual ao legado (`data-service.ts#createTotemConfig`/`updateTotemConfig`/`toggleTotemActive`
 * testam `isCloudApiMode()` ANTES do ramo Admin API/LAN). O corpo/resposta da escrita difere por
 * backend — ver `ApiTotemRepository`.
 */
export interface TotemRepository {
  list(): Promise<TotemConfig[]>;
  /** `GET /v1/totem-available-licenses?totemId=` — livres + a já vinculada a `currentTotemId`. */
  availableLicenses(currentTotemId: string | null): Promise<TotemLicenseSlot[]>;
  /** `GET /v1/totem-licenses` — todas as licenças da empresa/loja, para o mapa de rótulos amigáveis. */
  licensesForLabeling(): Promise<LicenseLabelRecord[]>;
  /** `GET /v1/totems/series-status` — numeração NFC-e por totem/ambiente. Só LAN; `[]` na nuvem. */
  seriesStatus(): Promise<TotemSeriesStatus[]>;
  /**
   * `GET /v1/totems/series-owner?serie=&environment=&totemId=` — outro dono da série NFC-e no
   * ambiente, para a tela perguntar antes de salvar (legado 1.3.13, `fetchTotemSeriesOwner`). Só
   * LAN: `nfce_series_config` não sincroniza, então na nuvem devolve `null` sem rede.
   */
  seriesOwner(serie: number, environment: number, totemId: string | null): Promise<TotemSeriesOwner | null>;
  /** `GET /v1/totems/:id/audit-logs`. */
  auditLogs(totemId: string): Promise<TotemAuditLog[]>;
  /** `POST /v1/totems`. */
  create(data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions): Promise<TotemCreateResult>;
  /** `PATCH /v1/totems/:id`. */
  update(id: string, data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions): Promise<void>;
  /** `PATCH /v1/totems/:id/active`. */
  setActive(id: string, isActive: boolean, licenseId: string | null): Promise<void>;
  /** `POST /v1/totems/:id/requeue-cloud-sync`. */
  requeueSync(id: string): Promise<TotemRequeueResult>;
}
