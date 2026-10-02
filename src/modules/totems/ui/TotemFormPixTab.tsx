"use client";

import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { XCircle, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { chaveRedigida } from "../domain/totem-form";
import type { TotemFormState } from "./use-totem-form-state";

/** Aba "PIX" — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx` (linhas 1203-1314). */
export function TotemFormPixTab({ state }: { state: TotemFormState }) {
  const { form, set, errors, licenseIsDemo, onPaymentEnvironmentChange } = state;

  return (
    <div className="m-0 space-y-3 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1 pb-1">
        <h3 className="text-sm font-semibold">PIX (serviço HTTP)</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          <span className="font-mono">EasyCommandPay-PIX-PIXnoPDV</span> — base para <span className="font-mono">{"POST /v1/transactions/{uuid}/charge"}</span>. Gravado em{" "}
          <span className="font-mono">nfce_totem_config</span>. Deixe vazio para o totem usar <span className="font-mono">PIX_SERVICE_HTTP_BASE</span> e{" "}
          <span className="font-mono">PIX_SERVICE_HTTP_API_KEY</span> no <span className="font-mono">.env</span>.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
        <div>
          <Label className="text-sm font-medium">Ambiente de pagamento (PIX / TEF)</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Credenciais homologação vs produção em <span className="font-mono">nfce_totem_config.payment_environment</span> e{" "}
            <span className="font-mono">pixnopdv_store_credentials</span>. Independente do modo de operação (aba Geral).
          </p>
        </div>
        <RadioGroup value={form.payment_environment ?? "homologacao"} onValueChange={onPaymentEnvironmentChange} className="grid gap-2 sm:grid-cols-2">
          <label htmlFor="payment_env_homologacao" className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background/80 p-2.5 hover:bg-muted/40">
            <RadioGroupItem value="homologacao" id="payment_env_homologacao" className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Homologação</span>
              <span className="text-[10px] text-muted-foreground">Sandbox PIX / testes TEF.</span>
            </span>
          </label>
          <label
            htmlFor="payment_env_producao"
            className={`flex items-start gap-2.5 rounded-md border bg-background/80 p-2.5 ${licenseIsDemo ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/40"} border-border`}
          >
            <RadioGroupItem value="producao" id="payment_env_producao" className="mt-0.5" disabled={licenseIsDemo} />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Produção</span>
              <span className="text-[10px] text-muted-foreground">Credenciais reais de pagamento.</span>
            </span>
          </label>
        </RadioGroup>
        {licenseIsDemo ? (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Licença Demo: ambiente Produção bloqueado para PIX/TEF.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pix_http_base_url" className="text-xs font-medium">URL base</Label>
        <Input
          id="pix_http_base_url"
          value={form.pix_http_base_url ?? ""}
          onChange={(e) => set("pix_http_base_url", e.target.value.trim() || null)}
          placeholder="http://127.0.0.1:8787"
          className={`font-mono text-xs ${errors.pix_http_base_url ? "border-destructive" : ""}`}
        />
        {errors.pix_http_base_url && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.pix_http_base_url}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pix_http_api_key" className="text-xs font-medium">
          X-Api-Key (opcional)
          {chaveRedigida(form.pix_http_api_key, form.pix_http_api_key_set) && <span className="ml-2 font-normal text-[10px] text-muted-foreground">(definido)</span>}
        </Label>
        <Input
          id="pix_http_api_key"
          type="password"
          value={form.pix_http_api_key ?? ""}
          onChange={(e) => set("pix_http_api_key", e.target.value || null)}
          placeholder={chaveRedigida(form.pix_http_api_key, form.pix_http_api_key_set) ? "•••••••• (manter)" : "Alinhar com HTTP_API_KEY do serviço PIX"}
          className="font-mono text-xs"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
