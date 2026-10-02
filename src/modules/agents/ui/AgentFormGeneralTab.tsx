"use client";

import { CheckCircle2, Server, XCircle, AlertTriangle } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Switch } from "@/shared/ui/primitives/switch";
import { Badge } from "@/shared/ui/primitives/badge";
import { SectionHeader } from "./AgentFormFieldHint";
import type { AgentConfigFormData } from "../domain/agent-config";
import type { AgentFormErrors, AgentNameStatus } from "../domain/agent-form-validation";

interface AgentFormGeneralTabProps {
  form: AgentConfigFormData;
  errors: AgentFormErrors;
  isEditing: boolean;
  nameStatus: AgentNameStatus;
  onChange: <K extends keyof AgentConfigFormData>(key: K, value: AgentConfigFormData[K]) => void;
}

/** Cópia fiel da aba "Geral" de `components/agent/AgentFormDialog.tsx`. */
export function AgentFormGeneralTab({ form, errors, isEditing, nameStatus, onChange }: AgentFormGeneralTabProps) {
  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <SectionHeader icon={Server} title="Identificação" description="Nome único e estado do agente" />
      <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-1.5">
          <Label htmlFor="agent_name" className="text-xs font-medium">
            Nome do Agente <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="agent_name"
              value={form.agent_name}
              onChange={(e) => onChange("agent_name", e.target.value)}
              placeholder="NFCe-SRV-MATRIZ"
              disabled={isEditing}
              className={`font-mono pr-8 ${errors.agent_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {nameStatus && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {nameStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {nameStatus === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
                {nameStatus === "duplicate" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </div>
            )}
          </div>
          {errors.agent_name ? (
            <p className="text-[11px] text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {errors.agent_name}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Formato: letras, números e hífen. Ref: NFCE_AGENT_NAME no .env</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5 pt-5">
          <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => onChange("is_active", v)} />
          <Badge variant={form.is_active ? "default" : "outline"} className={`text-[10px] ${form.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
            {form.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2">
        Série NFC-e e tpAmb de emissão são configurados no totem vinculado (Configurações → Totens).
        Este agente define o runtime do nfce-service (API, SEFAZ, contingência, sync).
      </p>
    </div>
  );
}
