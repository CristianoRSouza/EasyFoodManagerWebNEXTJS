"use client";

import { Settings2, RefreshCw } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { SectionHeader, FieldHint } from "./AgentFormFieldHint";
import { formatMs } from "../domain/agent-config";
import type { AgentConfigFormData } from "../domain/agent-config";
import type { AgentFormErrors } from "../domain/agent-form-validation";

interface AgentFormApiTabProps {
  form: AgentConfigFormData;
  errors: AgentFormErrors;
  onChange: <K extends keyof AgentConfigFormData>(key: K, value: AgentConfigFormData[K]) => void;
}

/** Cópia fiel da aba "API" de `components/agent/AgentFormDialog.tsx`. */
export function AgentFormApiTab({ form, errors, onChange }: AgentFormApiTabProps) {
  return (
    <div className="m-0 space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
      <section className="space-y-3">
        <SectionHeader icon={Settings2} title="API / Log" description="Limite de requisições e nível de log" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Rate Limit <span className="text-muted-foreground font-normal">(req/min)</span>
              <FieldHint text="Número máximo de requisições por minuto" />
            </Label>
            <Input
              type="number"
              min={1}
              value={form.api_rate_limit}
              onChange={(e) => onChange("api_rate_limit", Number(e.target.value))}
              className={errors.api_rate_limit ? "border-destructive" : ""}
            />
            {errors.api_rate_limit && <p className="text-[11px] text-destructive">{errors.api_rate_limit}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nível de Log <FieldHint text="Nível de detalhe dos logs" /></Label>
            <Select value={form.log_level} onValueChange={(v) => onChange("log_level", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="error"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" /> Error</span></SelectItem>
                <SelectItem value="warn"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> Warn</span></SelectItem>
                <SelectItem value="info"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" /> Info</span></SelectItem>
                <SelectItem value="debug"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Debug</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="border-t border-border/50" />

      <section className="space-y-3">
        <SectionHeader icon={RefreshCw} title="SEFAZ / Retry" description="Timeout e política de retentativas" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Timeout <span className="text-muted-foreground font-normal">(ms)</span> <FieldHint text="Tempo máximo de espera para resposta da SEFAZ" /></Label>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={form.sefaz_timeout_ms}
              onChange={(e) => onChange("sefaz_timeout_ms", Number(e.target.value))}
              className={errors.sefaz_timeout_ms ? "border-destructive" : ""}
            />
            {errors.sefaz_timeout_ms && <p className="text-[11px] text-destructive">{errors.sefaz_timeout_ms}</p>}
            <p className="text-[10px] text-muted-foreground">{formatMs(form.sefaz_timeout_ms)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tentativas <FieldHint text="Número de tentativas em caso de falha" /></Label>
            <Input
              type="number"
              min={1}
              value={form.retry_max_attempts}
              onChange={(e) => onChange("retry_max_attempts", Number(e.target.value))}
              className={errors.retry_max_attempts ? "border-destructive" : ""}
            />
            {errors.retry_max_attempts && <p className="text-[11px] text-destructive">{errors.retry_max_attempts}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Backoff <span className="text-muted-foreground font-normal">(ms)</span> <FieldHint text="Intervalo entre retentativas" /></Label>
            <Input
              type="number"
              min={0}
              step={500}
              value={form.retry_backoff_ms}
              onChange={(e) => onChange("retry_backoff_ms", Number(e.target.value))}
              className={errors.retry_backoff_ms ? "border-destructive" : ""}
            />
            {errors.retry_backoff_ms && <p className="text-[11px] text-destructive">{errors.retry_backoff_ms}</p>}
            {form.retry_backoff_ms > 0 && <p className="text-[10px] text-muted-foreground">{formatMs(form.retry_backoff_ms)}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
