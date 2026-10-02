"use client";

import { Shield } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Switch } from "@/shared/ui/primitives/switch";
import { Badge } from "@/shared/ui/primitives/badge";
import { SectionHeader, FieldHint } from "./AgentFormFieldHint";
import { formatMs } from "../domain/agent-config";
import type { AgentConfigFormData } from "../domain/agent-config";

interface AgentFormContingencyTabProps {
  form: AgentConfigFormData;
  onChange: <K extends keyof AgentConfigFormData>(key: K, value: AgentConfigFormData[K]) => void;
}

/** Cópia fiel da aba "Contingência" de `components/agent/AgentFormDialog.tsx`. */
export function AgentFormContingencyTab({ form, onChange }: AgentFormContingencyTabProps) {
  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <SectionHeader icon={Shield} title="Contingência" description="Modo offline quando a SEFAZ está indisponível" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <Switch id="contingency_enabled" checked={form.contingency_enabled} onCheckedChange={(v) => onChange("contingency_enabled", v)} />
          <div>
            <Label htmlFor="contingency_enabled" className="text-xs font-medium cursor-pointer">Contingência</Label>
            <p className="text-[10px] text-muted-foreground">{form.contingency_enabled ? "Modo offline ativo" : "Operação normal"}</p>
          </div>
          {form.contingency_enabled && <Badge variant="destructive" className="ml-auto text-[10px]">Ativa</Badge>}
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <Switch id="contingency_auto_transmit" checked={form.contingency_auto_transmit} onCheckedChange={(v) => onChange("contingency_auto_transmit", v)} />
          <div>
            <Label htmlFor="contingency_auto_transmit" className="text-xs font-medium cursor-pointer">Auto-transmitir</Label>
            <p className="text-[10px] text-muted-foreground">Enviar notas ao voltar online</p>
          </div>
        </div>
      </div>

      {form.contingency_enabled && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Motivo da Contingência</Label>
            <Input
              value={form.contingency_reason ?? ""}
              onChange={(e) => onChange("contingency_reason", e.target.value || null)}
              placeholder="Ex: SEFAZ fora do ar, manutenção programada…"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <Switch id="contingency_worker_enabled" checked={form.contingency_worker_enabled} onCheckedChange={(v) => onChange("contingency_worker_enabled", v)} />
          <div>
            <Label htmlFor="contingency_worker_enabled" className="text-xs font-medium cursor-pointer">Worker Contingência</Label>
            <p className="text-[10px] text-muted-foreground">Processamento automático</p>
          </div>
        </div>
        {form.contingency_worker_enabled && (
          <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-200">
            <Label className="text-xs font-medium">Intervalo Worker <span className="text-muted-foreground font-normal">(ms)</span> <FieldHint text="Intervalo em ms do worker de contingência. 0 = desativado." /></Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.contingency_worker_interval_ms}
              onChange={(e) => onChange("contingency_worker_interval_ms", Number(e.target.value))}
            />
            {form.contingency_worker_interval_ms > 0 && <p className="text-[10px] text-muted-foreground">{formatMs(form.contingency_worker_interval_ms)}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <Switch id="contingency_substitution_worker_enabled" checked={form.contingency_substitution_worker_enabled} onCheckedChange={(v) => onChange("contingency_substitution_worker_enabled", v)} />
          <div>
            <Label htmlFor="contingency_substitution_worker_enabled" className="text-xs font-medium cursor-pointer">Worker Substituição</Label>
            <p className="text-[10px] text-muted-foreground">Substituir notas de contingência</p>
          </div>
        </div>
        {form.contingency_substitution_worker_enabled && (
          <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-200">
            <Label className="text-xs font-medium">Intervalo Substituição <span className="text-muted-foreground font-normal">(ms)</span></Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.contingency_substitution_worker_interval_ms}
              onChange={(e) => onChange("contingency_substitution_worker_interval_ms", Number(e.target.value))}
            />
            {form.contingency_substitution_worker_interval_ms > 0 && <p className="text-[10px] text-muted-foreground">{formatMs(form.contingency_substitution_worker_interval_ms)}</p>}
          </div>
        )}
      </div>

      {form.contingency_substitution_worker_enabled && (
        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
          <Label className="text-xs font-medium">Justificativa Substituição <FieldHint text="Texto xJust para a nota de substituição" /></Label>
          <Input
            value={form.contingency_substitution_xjust ?? ""}
            onChange={(e) => onChange("contingency_substitution_xjust", e.target.value || null)}
            placeholder="Justificativa para substituição…"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">SLA Alerta <span className="text-muted-foreground font-normal">(horas)</span> <FieldHint text="Horas até alerta de SLA. 0 = desativado." /></Label>
          <Input type="number" min={0} value={form.contingency_sla_warn_hours} onChange={(e) => onChange("contingency_sla_warn_hours", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">SLA Bloqueio <span className="text-muted-foreground font-normal">(horas)</span> <FieldHint text="Horas até bloqueio por SLA. 0 = desativado." /></Label>
          <Input type="number" min={0} value={form.contingency_sla_block_hours} onChange={(e) => onChange("contingency_sla_block_hours", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}
