"use client";

import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { XCircle, AlertTriangle, Server, Image as ImageIcon } from "lucide-react";
import { Separator } from "@/shared/ui/primitives/separator";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { chaveRedigida } from "../domain/totem-form";
import type { TotemFormState } from "./use-totem-form-state";

/** Aba "NFC-e" — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx` (linhas 933-1201). */
export function TotemFormNfceTab({ state }: { state: TotemFormState }) {
  const { form, set, errors, isEditing, isCloudTotemAdmin, fiscalConfigTable, licenseIsDemo, onNfceEnvironmentChange, seriesForThisTotem, nextNumberLabel } = state;

  return (
    <div className="m-0 space-y-3 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1 pb-1">
        <h3 className="text-sm font-semibold">NFC-e (nfce-service)</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Emissão e API — gravado em <span className="font-mono">nfce_totem_config</span>.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nfce_service_url" className="text-xs font-medium">URL do serviço</Label>
        <Input
          id="nfce_service_url"
          value={form.nfce_service_url ?? ""}
          onChange={(e) => set("nfce_service_url", e.target.value.trim() || null)}
          placeholder="http://192.168.0.10:3002"
          className={`font-mono text-xs ${errors.nfce_service_url ? "border-destructive" : ""}`}
        />
        {errors.nfce_service_url && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.nfce_service_url}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nfce_service_api_key" className="text-xs font-medium">
            X-API-Key (opcional)
            {chaveRedigida(form.nfce_service_api_key, form.nfce_service_api_key_set) && (
              <span className="ml-2 font-normal text-[10px] text-muted-foreground">(definido)</span>
            )}
          </Label>
          <Input
            id="nfce_service_api_key"
            type="password"
            value={form.nfce_service_api_key ?? ""}
            onChange={(e) => set("nfce_service_api_key", e.target.value || null)}
            placeholder={chaveRedigida(form.nfce_service_api_key, form.nfce_service_api_key_set) ? "•••••••• (manter)" : "Se exigir autenticação"}
            className="font-mono text-xs"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nfce_emit_timeout_ms" className="text-xs font-medium">Timeout emissão (ms)</Label>
          <Input
            id="nfce_emit_timeout_ms"
            type="number"
            min={10000}
            max={300000}
            step={1000}
            value={form.nfce_emit_timeout_ms ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") set("nfce_emit_timeout_ms", null);
              else {
                const n = Number(raw);
                set("nfce_emit_timeout_ms", Number.isFinite(n) ? n : null);
              }
            }}
            placeholder="120000"
            className={errors.nfce_emit_timeout_ms ? "border-destructive" : ""}
          />
          {errors.nfce_emit_timeout_ms && <p className="text-[11px] text-destructive">{errors.nfce_emit_timeout_ms}</p>}
        </div>
      </div>

      <Separator className="my-1" />

      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-3">
        <div className="flex items-start gap-2">
          <Server className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-3 flex-1">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Escopo fiscal (SEFAZ)</h4>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Série e tpAmb ficam neste totem (<span className="font-mono">{fiscalConfigTable}.nfce_serie</span>,{" "}
                <span className="font-mono">nfce_environment</span>).
                {isCloudTotemAdmin ? (
                  <> Alterações na nuvem sincronizam para o POS via Sync-PG-SB.</>
                ) : (
                  <>
                    {" "}
                    Numeração em <span className="font-mono">nfce_series_config</span> (local). O nfce-service usa{" "}
                    <span className="font-mono">NFCE_AGENT_NAME</span> no .env só como identidade do processo.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nfce_serie" className="text-xs font-medium">Série NFC-e</Label>
              <Input
                id="nfce_serie"
                type="number"
                min={1}
                max={999}
                value={form.nfce_serie ?? 1}
                onChange={(e) => set("nfce_serie", Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                className={`font-mono text-xs max-w-[8rem] ${errors.nfce_serie ? "border-destructive" : ""}`}
              />
              {errors.nfce_serie ? (
                <p className="text-[11px] text-destructive">{errors.nfce_serie}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Fonte de verdade fiscal deste totem (1–999).
                  {isCloudTotemAdmin ? " Propaga para nfce_totem_config no POS após sync." : " Numeração em nfce_series_config por totem."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Ambiente NFC-e SEFAZ (tpAmb)</Label>
              <RadioGroup value={String(form.nfce_environment ?? 2)} onValueChange={onNfceEnvironmentChange} className="grid gap-2 sm:grid-cols-2">
                <label htmlFor="nfce_env_homolog" className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background/80 p-2.5 hover:bg-muted/40">
                  <RadioGroupItem value="2" id="nfce_env_homolog" className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Homologação (tpAmb 2)</span>
                    <span className="text-[10px] text-muted-foreground">Notas de teste na SEFAZ.</span>
                  </span>
                </label>
                <label
                  htmlFor="nfce_env_prod"
                  className={`flex items-start gap-2.5 rounded-md border bg-background/80 p-2.5 ${licenseIsDemo ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/40"} border-border`}
                >
                  <RadioGroupItem value="1" id="nfce_env_prod" className="mt-0.5" disabled={licenseIsDemo} />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Produção (tpAmb 1)</span>
                    <span className="text-[10px] text-muted-foreground">Notas fiscais válidas.</span>
                  </span>
                </label>
              </RadioGroup>
              {licenseIsDemo ? (
                <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Licença Demo: tpAmb Produção bloqueado para NFC-e.
                </p>
              ) : null}
            </div>

            {isEditing && seriesForThisTotem.length > 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-background/60 p-2.5 space-y-1.5">
                <p className="text-[11px] font-medium text-foreground">
                  Totem <span className="font-mono">{form.totem_name}</span> · série <span className="font-mono">{form.nfce_serie ?? "—"}</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-[10px] text-muted-foreground">
                  <p>
                    Homolog (2): próximo nº <span className="font-mono font-semibold text-foreground">{nextNumberLabel(2)}</span>
                  </p>
                  <p>
                    Produção (1): próximo nº <span className="font-mono font-semibold text-foreground">{nextNumberLabel(1)}</span>
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ambiente ativo deste totem: <span className="font-medium text-foreground">{form.nfce_environment === 1 ? "Produção (1)" : "Homologação (2)"}</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Separator className="my-1" />

      <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-muted/10 p-3">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Imagens de produtos</h4>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Quando <span className="font-mono">products.image_url</span> estiver vazio, o totem monta{" "}
              <span className="font-mono">{"http://host:porta/images/{ean}.jpg"}</span>.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="image_server_host" className="text-xs font-medium">Host / IP</Label>
              <Input
                id="image_server_host"
                value={form.image_server_host ?? ""}
                onChange={(e) => set("image_server_host", e.target.value)}
                placeholder="127.0.0.1"
                className={`font-mono text-xs ${errors.image_server_host ? "border-destructive" : ""}`}
              />
              {errors.image_server_host && <p className="text-[11px] text-destructive">{errors.image_server_host}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image_server_port" className="text-xs font-medium">Porta</Label>
              <Input
                id="image_server_port"
                type="number"
                min={1}
                max={65535}
                value={form.image_server_port ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") set("image_server_port", null);
                  else {
                    const n = Number(raw);
                    set("image_server_port", Number.isFinite(n) ? n : null);
                  }
                }}
                placeholder="3001"
                className={errors.image_server_port ? "border-destructive" : ""}
              />
              {errors.image_server_port && <p className="text-[11px] text-destructive">{errors.image_server_port}</p>}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Padrão ao criar totem: <span className="font-mono">127.0.0.1</span> e porta <span className="font-mono">3001</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
