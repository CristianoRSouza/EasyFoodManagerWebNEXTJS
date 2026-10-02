"use client";

import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Switch } from "@/shared/ui/primitives/switch";
import { Badge } from "@/shared/ui/primitives/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Separator } from "@/shared/ui/primitives/separator";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { SwitchRow } from "./SwitchRow";
import type { TotemFormState } from "./use-totem-form-state";

/** Aba "Geral" — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx` (linhas 588-783). */
export function TotemFormGeneralTab({ state }: { state: TotemFormState }) {
  const { form, set, errors, isEditing, nameStatus, licenseIsDemo, licensePoolMode, selectedLicenseId, localPaidLicenseLock, handleToggleActive, onAppModeChange } = state;

  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1.5">
        <Label htmlFor="totem_name" className="text-xs font-medium">
          Nome do Totem <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="totem_name"
            value={form.totem_name}
            onChange={(e) => set("totem_name", e.target.value.toUpperCase())}
            placeholder="TOTEM-LOJA01-CAIXA01"
            disabled={isEditing}
            className={`font-mono pr-8 ${errors.totem_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {nameStatus && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {nameStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {nameStatus === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
              {nameStatus === "duplicate" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
          )}
        </div>
        {errors.totem_name ? (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.totem_name}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Formato: A-Z, 0-9 e hífen</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/15 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="is_active" className="cursor-pointer text-sm font-medium">
              Status
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {localPaidLicenseLock
                ? "Licença paga: ativação e vínculo são controlados pelo portal web."
                : form.is_active
                  ? "Ativo no bootstrap e listagens"
                  : "Inativo — ignorado pelo bootstrap"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Switch id="is_active" checked={form.is_active} onCheckedChange={handleToggleActive} disabled={localPaidLicenseLock} />
            <Badge variant={form.is_active ? "default" : "outline"} className={`text-[10px] ${form.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
              {form.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        {localPaidLicenseLock && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Licença <strong>paga</strong>: o status deste totem é definido no portal web e o sync entrega ao PG local.
            </span>
          </p>
        )}
        {!localPaidLicenseLock && licensePoolMode && !selectedLicenseId && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Sem licença vinculada — vá até a aba <strong>Licença</strong> para configurar antes de ativar.
            </span>
          </p>
        )}
        {errors.license && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.license}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
        <div>
          <Label className="text-sm font-medium">Modo de operação</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Demonstração (dados fictícios sem PG), Homologação (PG + busca manual) ou Produção (PG + só leitor). Equivale ao
            arquivo app-mode.json no equipamento.
          </p>
        </div>
        <RadioGroup value={form.app_mode ?? "demo"} onValueChange={onAppModeChange} className="grid gap-2 sm:grid-cols-1" aria-invalid={!!errors.app_mode}>
          <label
            htmlFor="app_mode_demo"
            className={`flex cursor-pointer items-start gap-2.5 rounded-md border bg-background/80 p-2.5 text-left transition-colors hover:bg-muted/40 ${errors.app_mode ? "border-destructive" : "border-border"}`}
          >
            <RadioGroupItem value="demo" id="app_mode_demo" className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Demonstração</span>
              <span className="text-[10px] text-muted-foreground">Dados fictícios, sem processamento real.</span>
            </span>
          </label>
          <label
            htmlFor="app_mode_homologacao"
            className={`flex cursor-pointer items-start gap-2.5 rounded-md border bg-background/80 p-2.5 text-left transition-colors hover:bg-muted/40 ${errors.app_mode ? "border-destructive" : "border-border"}`}
          >
            <RadioGroupItem value="homologacao" id="app_mode_homologacao" className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Homologação</span>
              <span className="text-[10px] text-muted-foreground">PG real + busca manual quando aplicável.</span>
            </span>
          </label>
          <label
            htmlFor="app_mode_producao"
            className={`flex items-start gap-2.5 rounded-md border bg-background/80 p-2.5 text-left transition-colors ${
              licenseIsDemo ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/40"
            } ${errors.app_mode ? "border-destructive" : "border-border"}`}
          >
            <RadioGroupItem value="producao" id="app_mode_producao" className="mt-0.5" disabled={licenseIsDemo} />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Produção</span>
              <span className="text-[10px] text-muted-foreground">
                PG real, fluxo só com leitor.
                {licenseIsDemo ? " Indisponível com licença Demo." : ""}
              </span>
            </span>
          </label>
        </RadioGroup>
        {licenseIsDemo ? (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Licença Demo: Produção bloqueada — apenas Demonstração e Homologação.
          </p>
        ) : null}
        {errors.app_mode ? (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.app_mode}
          </p>
        ) : null}
      </div>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Formas de pagamento no totem</CardTitle>
          <CardDescription className="text-[10px] leading-snug">Ative/desative por equipamento. O totem só exibe as opções habilitadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3 pt-3">
          <SwitchRow id="payment_credit_enabled" label="Cartão de crédito" desc="Se desativado, o totem não permite pagamento com crédito." checked={!!form.payment_credit_enabled} onChange={(v) => set("payment_credit_enabled", v)} />
          <Separator />
          <SwitchRow id="payment_debit_enabled" label="Cartão de débito" desc="Se desativado, o totem não permite pagamento com débito." checked={!!form.payment_debit_enabled} onChange={(v) => set("payment_debit_enabled", v)} />
          <Separator />
          <SwitchRow id="payment_pix_enabled" label="PIX" desc="Se desativado, o totem não oferece PIX na etapa de pagamento." checked={!!form.payment_pix_enabled} onChange={(v) => set("payment_pix_enabled", v)} />
          <Separator />
          <SwitchRow
            id="payment_voucher_enabled"
            label="Voucher"
            desc="Se desativado, o totem não oferece voucher (vale-refeição/alimentação) na etapa de pagamento."
            checked={!!form.payment_voucher_enabled}
            onChange={(v) => set("payment_voucher_enabled", v)}
          />
          {form.payment_voucher_enabled ? (
            <div className="space-y-1.5 pl-1">
              <Label className="text-[11px] text-muted-foreground">Tipo do voucher na NFC-e</Label>
              <RadioGroup
                value={form.payment_voucher_kind === "food" ? "food" : "meal"}
                onValueChange={(v) => set("payment_voucher_kind", v === "food" ? "food" : "meal")}
                className="grid gap-2 sm:grid-cols-2"
              >
                <label
                  htmlFor="payment_voucher_kind_meal"
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background/80 p-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <RadioGroupItem value="meal" id="payment_voucher_kind_meal" className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Vale Refeição</span>
                    <span className="text-[10px] text-muted-foreground">tPag 11 — restaurantes e lanchonetes.</span>
                  </span>
                </label>
                <label
                  htmlFor="payment_voucher_kind_food"
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background/80 p-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <RadioGroupItem value="food" id="payment_voucher_kind_food" className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Vale Alimentação</span>
                    <span className="text-[10px] text-muted-foreground">tPag 10 — mercados e supermercados.</span>
                  </span>
                </label>
              </RadioGroup>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
