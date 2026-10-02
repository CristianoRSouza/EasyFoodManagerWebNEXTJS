"use client";

import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { Monitor, Plus, Power } from "lucide-react";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { SummaryCard } from "@/shared/ui/SummaryCard";
import { useTotemsPage } from "./use-totems-page";
import { TotemCard } from "./TotemCard";
import { TotemFormDialog } from "./TotemFormDialog";
import { TotemAuditDialog } from "./TotemAuditDialog";
import { TotemReactivateLicenseDialog } from "./TotemReactivateLicenseDialog";
import { isEditingPaidLicense } from "../domain/totem-license-policy";

/**
 * Totens (`/totems`) — cópia fiel de `LEGACY/src/pages/TotemConfigPage.tsx`.
 *
 * Os dois backends gravam totens — o legado grava tanto no LAN (Admin API) quanto na nuvem
 * (EasyFoodAPI, `isCloudApiMode()`), então "Novo Totem", "Editar", o switch de status e o botão de
 * reenfileirar aparecem sempre, sem condição de escrita (o antigo `canWrite`, sempre `true`, foi
 * removido — fase-4-revisao-final.md, Menor 2). Só o texto/corpo por trás de cada ação muda por
 * backend — ver `infrastructure/api-totem-repository.ts` e o relatório de integração da Fase 4.
 */
export function TotemsPage() {
  const {
    totems,
    isLoading,
    refetch,
    activeCount,
    dialogOpen,
    setDialogOpen,
    editingTotem,
    auditOpen,
    setAuditOpen,
    auditTotem,
    reactivateTotem,
    setReactivateTotem,
    policy,
    selectableLicenses,
    freeLicenses,
    editingPaidLicense,
    licenseLabelMap,
    totemSeriesStatuses,
    openEdit,
    openCreate,
    openAudit,
    handleCreate,
    handleUpdate,
    handleToggle,
    handleReactivateConfirm,
    handleRequeueSync,
    lookupSeriesOwner,
  } = useTotemsPage();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 shrink-0">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Gestor de Totens</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
              Cadastro dos totens e URL/API do nfce-service por equipamento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1 sm:flex-none">
                  <Button
                    onClick={openCreate}
                    className="w-full"
                    disabled={policy.cloudMode && freeLicenses.length === 0 && selectableLicenses.length > 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Totem
                  </Button>
                </span>
              </TooltipTrigger>
              {policy.cloudMode && freeLicenses.length === 0 && selectableLicenses.length > 0 && (
                <TooltipContent>Todas as licenças estão em uso  contrate extras no plano</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <PageRefreshButton onClick={() => refetch()} />
        </div>
      </div>

      {totems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SummaryCard icon={Monitor} label="Total" value={totems.length} color="text-primary" />
          <SummaryCard
            icon={Power}
            label="Ativos"
            value={activeCount}
            color="text-emerald-500"
            subtitle={`${totems.length - activeCount} inativos`}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3" aria-busy="true" aria-label="Carregando totens">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : totems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted">
              <Monitor className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum totem cadastrado</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar primeiro totem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {totems.map((t) => (
            <TotemCard
              key={t.id}
              totem={t}
              licenseLabelMap={licenseLabelMap}
              showLocalLicenseHint={policy.localPgOnly}
              showRequeueButton
              requeueToCloud={policy.localPgOnly}
              lockActiveToggle={policy.localPgOnly && isEditingPaidLicense(t)}
              onEdit={() => openEdit(t)}
              onAudit={() => openAudit(t)}
              onToggle={(v) => handleToggle(t.id, t.totem_name, v, t.license_id ?? null)}
              onRequeueSync={() => handleRequeueSync(t)}
            />
          ))}
        </div>
      )}

      {(dialogOpen || editingTotem) && (
        <TotemFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          totem={editingTotem}
          existingNames={totems.map((t) => t.totem_name)}
          availableLicenses={selectableLicenses}
          cloudMode={policy.cloudMode}
          licensePoolMode={policy.licensePoolMode && !editingPaidLicense}
          localLicenseReadOnly={policy.localPgOnly && editingPaidLicense}
          licenseLabelMap={licenseLabelMap}
          totemSeriesStatuses={totemSeriesStatuses}
          onSubmit={editingTotem ? handleUpdate : handleCreate}
          lookupSeriesOwner={lookupSeriesOwner}
        />
      )}

      {(auditOpen || auditTotem) && (
        <TotemAuditDialog open={auditOpen} onOpenChange={setAuditOpen} totemId={auditTotem?.id ?? null} totemName={auditTotem?.totem_name ?? ""} />
      )}

      {reactivateTotem && (
        <TotemReactivateLicenseDialog
          open={!!reactivateTotem}
          onOpenChange={(v) => {
            if (!v) setReactivateTotem(null);
          }}
          totemName={reactivateTotem.totem_name}
          freeLicenses={freeLicenses}
          licenseLabelMap={licenseLabelMap}
          onConfirm={handleReactivateConfirm}
        />
      )}
    </div>
  );
}
