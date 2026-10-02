"use client";

import { useAutoHideScroll } from "@/shared/ui/use-auto-hide-scroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/primitives/dialog";
import { Button } from "@/shared/ui/primitives/button";
import { Monitor, Loader2, RotateCcw, FileText, CreditCard, Wifi, Settings, QrCode, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { useTotemFormState } from "./use-totem-form-state";
import { TotemFormGeneralTab } from "./TotemFormGeneralTab";
import { TotemFormLicenseTab } from "./TotemFormLicenseTab";
import { TotemFormNfceTab } from "./TotemFormNfceTab";
import { TotemFormPixTab } from "./TotemFormPixTab";
import { TotemFormTefTab } from "./TotemFormTefTab";
import { TotemFormAditumTab } from "./TotemFormAditumTab";
import type { TotemConfig, TotemConfigFormData, TotemLicenseSlot, TotemSeriesStatus } from "../domain/totem-config";
import type { TotemFormTab } from "../domain/totem-form";
import { describeTotemSeriesOwner, formatTpAmbLabel } from "../domain/totem-fiscal";
import type { TotemSeriesSaveOptions } from "../application/totem-repository";
import type { TotemSeriesOwnerLookup } from "./use-totem-form-state";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";

interface TotemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totem?: TotemConfig | null;
  existingNames?: string[];
  availableLicenses?: TotemLicenseSlot[];
  cloudMode?: boolean;
  licensePoolMode: boolean;
  localLicenseReadOnly?: boolean;
  licenseLabelMap?: Map<string, string>;
  totemSeriesStatuses?: TotemSeriesStatus[];
  onSubmit: (data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions) => Promise<void>;
  /** Dono da série NFC-e (legado 1.3.13, PR #56) — `TotemRepository#seriesOwner`. */
  lookupSeriesOwner?: TotemSeriesOwnerLookup;
}

const TabBadgeError = () => <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-destructive" aria-label="erro" />;

/**
 * Diálogo de cadastro/edição de totem — cópia fiel de
 * `LEGACY/src/components/totem/TotemFormDialog.tsx` (1.676 linhas no legado), dividido em abas
 * próprias (`TotemForm*Tab.tsx`) para nenhum arquivo passar de ~300 linhas. Estado e regras em
 * `use-totem-form-state.ts` + `domain/totem-form.ts`.
 */
export function TotemFormDialog({
  open,
  onOpenChange,
  totem = null,
  existingNames = [],
  availableLicenses = [],
  cloudMode = false,
  licensePoolMode,
  localLicenseReadOnly = false,
  licenseLabelMap = new Map(),
  totemSeriesStatuses = [],
  onSubmit,
  lookupSeriesOwner,
}: TotemFormDialogProps) {
  const scrollRef = useAutoHideScroll<HTMLDivElement>();
  const state = useTotemFormState({
    open,
    totem,
    existingNames,
    availableLicenses,
    cloudMode,
    licensePoolMode,
    localLicenseReadOnly,
    totemSeriesStatuses,
    onSubmit,
    lookupSeriesOwner,
  });
  const { isEditing, activeTab, setActiveTab, saving, errorTabs, showLicenseTab, handleSubmit, handleRestoreDefaults } = state;
  const { form, pendingTransfer, setPendingTransfer, confirmTransfer } = state;

  const onSubmitClick = async () => {
    try {
      const ok = await handleSubmit();
      if (ok) onOpenChange(false);
    } catch {
      // A página já mostrou "Erro ao cadastrar/salvar" e relançou só para o diálogo continuar
      // aberto; engolir aqui evita a rejeição sem tratamento que o legado deixa no console.
    }
  };

  const onConfirmTransferClick = async () => {
    try {
      const ok = await confirmTransfer();
      if (ok) onOpenChange(false);
    } catch {
      // Mesmo motivo de `onSubmitClick`: a página já mostrou o erro.
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-2xl sm:rounded-lg sm:border">
        <div className="shrink-0 border-b border-border bg-muted/30 px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 sm:h-10 sm:w-10">
                <Monitor className="h-4.5 w-4.5 text-primary sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg">{isEditing ? "Editar Totem" : "Novo Totem"}</DialogTitle>
                <DialogDescription className="mt-1 text-[11px] leading-snug sm:text-xs">
                  {isEditing ? `Configuração de ${totem?.totem_name}` : "Identificação do equipamento e URLs dos serviços usados neste totem."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TotemFormTab)} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border bg-background px-2 pb-2 pt-1 sm:px-6 sm:pb-2 sm:pt-1.5">
            <TabsList className={`grid h-auto w-full ${showLicenseTab ? "grid-cols-6" : "grid-cols-5"} gap-1`}>
              <TabsTrigger value="geral" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">Geral{errorTabs.geral && <TabBadgeError />}</span>
              </TabsTrigger>
              {showLicenseTab && (
                <TabsTrigger value="licenca" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                  <KeyRound className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  <span className="flex items-center">Licença{errorTabs.licenca && <TabBadgeError />}</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="nfce" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <FileText className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">NFC-e{errorTabs.nfce && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="pix" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <QrCode className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">PIX{errorTabs.pix && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="tef" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <Wifi className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">TEF{errorTabs.tef && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="aditum" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <CreditCard className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">Aditum{errorTabs.aditum && <TabBadgeError />}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain autohide-scroll">
            <TabsContent value="geral" className="m-0">
              <TotemFormGeneralTab state={state} />
            </TabsContent>
            {showLicenseTab && (
              <TabsContent value="licenca" className="m-0">
                <TotemFormLicenseTab state={state} totem={totem} cloudMode={cloudMode} localLicenseReadOnly={localLicenseReadOnly} licenseLabelMap={licenseLabelMap} />
              </TabsContent>
            )}
            <TabsContent value="nfce" className="m-0">
              <TotemFormNfceTab state={state} />
            </TabsContent>
            <TabsContent value="pix" className="m-0">
              <TotemFormPixTab state={state} />
            </TabsContent>
            <TabsContent value="tef" className="m-0">
              <TotemFormTefTab state={state} />
            </TabsContent>
            <TabsContent value="aditum" className="m-0">
              <TotemFormAditumTab state={state} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
          <Button type="button" variant="ghost" size="sm" className="order-2 w-full sm:order-1 sm:w-auto" onClick={handleRestoreDefaults} disabled={saving}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Restaurar padrões
          </Button>
          <div className="order-1 grid w-full grid-cols-2 gap-2 sm:order-2 sm:flex sm:w-auto sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={onSubmitClick} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={pendingTransfer != null} onOpenChange={(o) => { if (!o) setPendingTransfer(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transferir a série NFC-e?</AlertDialogTitle>
          {pendingTransfer ? (
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{describeTotemSeriesOwner(pendingTransfer.owner)}</p>
                <p>
                  Ao transferir, <span className="font-medium text-foreground">{form.totem_name}</span> passa a
                  emitir na série {pendingTransfer.owner.serie} de{" "}
                  {formatTpAmbLabel(pendingTransfer.owner.environment).toLowerCase()}, e a numeração continua do{" "}
                  <span className="font-mono font-semibold text-foreground">
                    nº {pendingTransfer.owner.current_number + 1}
                  </span>
                  .
                </p>
                <p>
                  Só este ambiente é transferido.
                  {pendingTransfer.owner.owner_totem_name
                    ? ` O totem ${pendingTransfer.owner.owner_totem_name} fica sem essa série.`
                    : ""}
                </p>
              </div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirmTransferClick()}>Transferir e salvar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
