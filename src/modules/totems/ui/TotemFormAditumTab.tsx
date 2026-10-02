"use client";

import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Separator } from "@/shared/ui/primitives/separator";
import { sanitizePlainText, APP_NAME_MAX } from "../domain/totem-form";
import { SwitchRow } from "./SwitchRow";
import type { TotemFormState } from "./use-totem-form-state";

/**
 * Aba "TEF Aditum — Runtime" — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx`
 * (linhas 1365-1621). Contém os dois campos de segredo cifrado (`aditum_partner_token`,
 * `aditum_activation_code`) — INVARIANTE: os campos SEMPRE abrem em branco (garantido pelo hook
 * de estado, que força `null` na população do formulário — ver `use-totem-form-state.ts`), e o
 * texto "(definido)" só aparece a partir do flag `*_encrypted_set`, nunca do valor.
 */
export function TotemFormAditumTab({ state }: { state: TotemFormState }) {
  const { form, set, errors } = state;

  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1 pb-1">
        <h3 className="text-sm font-semibold">TEF Aditum — Runtime</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Configurações que antes vinham do <span className="font-mono">.env</span> do tef-service.
        </p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[10px] leading-snug text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mr-1 inline h-3 w-3" />
        Tokens cifrados automaticamente (AES-256-GCM <span className="font-mono">enc:v1:</span>) com <span className="font-mono">SENSITIVE_SECRET_MASTER_KEY_BASE64</span> antes de gravar.
      </div>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="tef_base_url" className="text-xs font-medium">URL Aditum (TEF_BASE_URL)</Label>
            <Input
              id="tef_base_url"
              value={form.tef_base_url ?? ""}
              onChange={(e) => set("tef_base_url", e.target.value.trim() || null)}
              placeholder="https://localhost:4090"
              className={`font-mono text-xs ${errors.tef_base_url ? "border-destructive" : ""}`}
            />
            {errors.tef_base_url && <p className="text-[11px] text-destructive">{errors.tef_base_url}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="establishment_cnpj" className="text-xs font-medium">CNPJ do estabelecimento</Label>
            <Input
              id="establishment_cnpj"
              value={form.establishment_cnpj ?? ""}
              onChange={(e) => set("establishment_cnpj", e.target.value.replace(/\D/g, "").slice(0, 14) || null)}
              placeholder="13971933000178"
              inputMode="numeric"
              maxLength={14}
              className={`font-mono text-xs ${errors.establishment_cnpj ? "border-destructive" : ""}`}
            />
            {errors.establishment_cnpj && <p className="text-[11px] text-destructive">{errors.establishment_cnpj}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Credenciais Aditum</CardTitle>
          <CardDescription className="text-[10px] leading-snug">Deixe vazio para preservar o valor cifrado existente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-3 pb-3 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="aditum_partner_token" className="text-xs font-medium">
              Partner Token
              {form.aditum_partner_token_encrypted_set && !form.aditum_partner_token?.trim() && (
                <span className="ml-2 font-normal text-[10px] text-muted-foreground">(definido)</span>
              )}
            </Label>
            <Input
              id="aditum_partner_token"
              type="password"
              value={form.aditum_partner_token ?? ""}
              onChange={(e) => set("aditum_partner_token", e.target.value || null)}
              placeholder={form.aditum_partner_token_encrypted_set ? "•••••••• (manter)" : "ADITUM_PARTNER_TOKEN"}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aditum_activation_code" className="text-xs font-medium">
              Ativation Code
              {form.aditum_activation_code_encrypted_set && !form.aditum_activation_code?.trim() && (
                <span className="ml-2 font-normal text-[10px] text-muted-foreground">(definido)</span>
              )}
            </Label>
            <Input
              id="aditum_activation_code"
              type="password"
              value={form.aditum_activation_code ?? ""}
              onChange={(e) => set("aditum_activation_code", e.target.value || null)}
              placeholder={form.aditum_activation_code_encrypted_set ? "•••••••• (manter)" : "ADITUM_ACTIVATION_CODE"}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Aplicação Pinpad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-3 pb-3 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tef_application_name" className="text-xs font-medium">Application Name</Label>
            <Input
              id="tef_application_name"
              value={form.tef_application_name ?? ""}
              onChange={(e) => set("tef_application_name", sanitizePlainText(e.target.value).slice(0, APP_NAME_MAX))}
              placeholder="EasySoft PDV"
              maxLength={APP_NAME_MAX}
              className={`text-xs ${errors.tef_application_name ? "border-destructive" : ""}`}
            />
            {errors.tef_application_name && <p className="text-[11px] text-destructive">{errors.tef_application_name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tef_application_version" className="text-xs font-medium">Application Version</Label>
            <Input
              id="tef_application_version"
              value={form.tef_application_version ?? ""}
              onChange={(e) => set("tef_application_version", e.target.value.replace(/[^0-9.]/g, "").slice(0, 15))}
              placeholder="1.0.0"
              inputMode="decimal"
              className={`font-mono text-xs ${errors.tef_application_version ? "border-destructive" : ""}`}
            />
            {errors.tef_application_version && <p className="text-[11px] text-destructive">{errors.tef_application_version}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Operação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tef_poll_interval_ms" className="text-xs font-medium">Poll interval (ms)</Label>
              <Input
                id="tef_poll_interval_ms"
                type="number"
                min={100}
                max={60000}
                step={100}
                value={form.tef_poll_interval_ms ?? ""}
                onChange={(e) => set("tef_poll_interval_ms", e.target.value === "" ? null : Number(e.target.value))}
                className={`text-xs ${errors.tef_poll_interval_ms ? "border-destructive" : ""}`}
              />
              {errors.tef_poll_interval_ms && <p className="text-[11px] text-destructive">{errors.tef_poll_interval_ms}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tef_poll_max_ms" className="text-xs font-medium">Poll max (ms)</Label>
              <Input
                id="tef_poll_max_ms"
                type="number"
                min={1000}
                max={600000}
                step={1000}
                value={form.tef_poll_max_ms ?? ""}
                onChange={(e) => set("tef_poll_max_ms", e.target.value === "" ? null : Number(e.target.value))}
                className={`text-xs ${errors.tef_poll_max_ms ? "border-destructive" : ""}`}
              />
              {errors.tef_poll_max_ms && <p className="text-[11px] text-destructive">{errors.tef_poll_max_ms}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tef_credit_installment_type" className="text-xs font-medium">Crédito parcelado</Label>
            <select
              id="tef_credit_installment_type"
              value={form.tef_credit_installment_type ?? "Merchant"}
              onChange={(e) => set("tef_credit_installment_type", e.target.value as "Merchant" | "Issuer")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="Merchant">Merchant — sem juros (lojista absorve)</option>
              <option value="Issuer">Issuer — com juros (emissor cobra)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tef_claim_source_statuses" className="text-xs font-medium">Status reivindicáveis (CSV)</Label>
            <Input
              id="tef_claim_source_statuses"
              value={form.tef_claim_source_statuses ?? ""}
              onChange={(e) => {
                const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_,]/g, "");
                set("tef_claim_source_statuses", cleaned || null);
              }}
              placeholder="pending,tef_requested"
              maxLength={200}
              className={`font-mono text-xs ${errors.tef_claim_source_statuses ? "border-destructive" : ""}`}
            />
            {errors.tef_claim_source_statuses && <p className="text-[11px] text-destructive">{errors.tef_claim_source_statuses}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Comportamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3 pt-3">
          <SwitchRow id="tef_contactless" label="Contactless (NFC)" desc="Habilita pagamento por aproximação no pinpad." checked={!!form.tef_contactless} onChange={(v) => set("tef_contactless", v)} />
          <Separator />
          <SwitchRow
            id="tef_confirm_after_charge"
            label="Confirmar após cobrança"
            desc="Chama GET /v2/charge/confirmation/{nsu} após aprovar."
            checked={!!form.tef_confirm_after_charge}
            onChange={(v) => set("tef_confirm_after_charge", v)}
          />
          <Separator />
          <SwitchRow
            id="tef_enable_worker_pending_job"
            label="Worker fila pending"
            desc="false = só processa via HTTP por ID (recomendado)."
            checked={!!form.tef_enable_worker_pending_job}
            onChange={(v) => set("tef_enable_worker_pending_job", v)}
          />
          <Separator />
          <SwitchRow
            id="tef_insecure_tls"
            label="Insecure TLS"
            desc="Ignora validação TLS ao chamar Aditum local (apenas dev)."
            checked={!!form.tef_insecure_tls}
            onChange={(v) => set("tef_insecure_tls", v)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
