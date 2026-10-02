"use client";

import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { XCircle } from "lucide-react";
import { chaveRedigida } from "../domain/totem-form";
import type { TotemFormState } from "./use-totem-form-state";

/** Aba "TEF" (wrapper HTTP) — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx` (linhas 1316-1363). */
export function TotemFormTefTab({ state }: { state: TotemFormState }) {
  const { form, set, errors } = state;

  return (
    <div className="m-0 space-y-3 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1 pb-1">
        <h3 className="text-sm font-semibold">TEF Aditum (HTTP wrapper)</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          URL base do <span className="font-mono">EasyCommandPay-TEF-Aditum-Service</span> — proxy HTTP do pinpad.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tef_http_base_url" className="text-xs font-medium">URL base</Label>
        <Input
          id="tef_http_base_url"
          value={form.tef_http_base_url ?? ""}
          onChange={(e) => set("tef_http_base_url", e.target.value.trim() || null)}
          placeholder="http://127.0.0.1:3090"
          className={`font-mono text-xs ${errors.tef_http_base_url ? "border-destructive" : ""}`}
        />
        {errors.tef_http_base_url && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3 shrink-0" /> {errors.tef_http_base_url}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tef_http_api_key" className="text-xs font-medium">
          X-Api-Key (opcional)
          {chaveRedigida(form.tef_http_api_key, form.tef_http_api_key_set) && <span className="ml-2 font-normal text-[10px] text-muted-foreground">(definido)</span>}
        </Label>
        <Input
          id="tef_http_api_key"
          type="password"
          value={form.tef_http_api_key ?? ""}
          onChange={(e) => set("tef_http_api_key", e.target.value || null)}
          placeholder={chaveRedigida(form.tef_http_api_key, form.tef_http_api_key_set) ? "•••••••• (manter)" : "Alinhar com HTTP_API_KEY do serviço TEF"}
          className="font-mono text-xs"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
