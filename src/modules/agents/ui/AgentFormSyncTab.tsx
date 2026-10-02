"use client";

import { Globe } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Switch } from "@/shared/ui/primitives/switch";
import { SectionHeader, FieldHint } from "./AgentFormFieldHint";
import type { AgentConfigFormData } from "../domain/agent-config";

interface AgentFormSyncTabProps {
  form: AgentConfigFormData;
  onChange: <K extends keyof AgentConfigFormData>(key: K, value: AgentConfigFormData[K]) => void;
}

/** Cópia fiel da aba "Sync" de `components/agent/AgentFormDialog.tsx`. */
export function AgentFormSyncTab({ form, onChange }: AgentFormSyncTabProps) {
  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <SectionHeader icon={Globe} title="Sincronização" description="Serviço EasySync" />
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
        <Switch id="sync_service_enabled" checked={form.sync_service_enabled} onCheckedChange={(v) => onChange("sync_service_enabled", v)} />
        <div>
          <Label htmlFor="sync_service_enabled" className="text-xs font-medium cursor-pointer">Serviço de Sincronização</Label>
          <p className="text-[10px] text-muted-foreground">{form.sync_service_enabled ? "Habilitado" : "Desabilitado"}</p>
        </div>
      </div>
      {form.sync_service_enabled && (
        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
          <Label className="text-xs font-medium">URL do Serviço <FieldHint text="Endereço do EasySync (ex: http://localhost:3000)" /></Label>
          <Input
            value={form.sync_service_url ?? ""}
            onChange={(e) => onChange("sync_service_url", e.target.value || null)}
            placeholder="http://localhost:3000"
            className="font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
