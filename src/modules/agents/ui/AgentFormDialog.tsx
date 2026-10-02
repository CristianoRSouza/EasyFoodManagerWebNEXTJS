"use client";

import { useEffect, useState } from "react";
import { useAutoHideScroll } from "@/shared/ui/use-auto-hide-scroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/primitives/dialog";
import { Button } from "@/shared/ui/primitives/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { Server, Settings2, AlertTriangle, Globe, Loader2, RotateCcw } from "lucide-react";
import { agentConfigToFormData, createAgentFormDefaults } from "../domain/agent-config";
import {
  agentFormErrorTabs, agentNameStatus, firstErrorTab, validateAgentForm,
  type AgentFormErrors, type AgentFormTab,
} from "../domain/agent-form-validation";
import { AgentFormGeneralTab } from "./AgentFormGeneralTab";
import { AgentFormApiTab } from "./AgentFormApiTab";
import { AgentFormContingencyTab } from "./AgentFormContingencyTab";
import { AgentFormSyncTab } from "./AgentFormSyncTab";
import type { AgentConfig, AgentConfigFormData } from "../domain/agent-config";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AgentConfig | null;
  existingNames?: string[];
  onSubmit: (data: AgentConfigFormData) => Promise<void>;
}

const TabBadgeError = () => (
  <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-destructive" aria-label="erro" />
);

/**
 * Cópia fiel de `components/agent/AgentFormDialog.tsx`, dividida em uma aba por arquivo
 * (`AgentForm{General,Api,Contingency,Sync}Tab.tsx`) para caber no limite de ~300 linhas por
 * arquivo do módulo — o JSX de cada aba é idêntico ao legado, só movido.
 */
export function AgentFormDialog({ open, onOpenChange, agent, existingNames = [], onSubmit }: AgentFormDialogProps) {
  const isEditing = !!agent;
  const [activeTab, setActiveTab] = useState<AgentFormTab>("geral");
  const [form, setForm] = useState<AgentConfigFormData>(() => createAgentFormDefaults());
  const [errors, setErrors] = useState<AgentFormErrors>({});
  const [saving, setSaving] = useState(false);
  const scrollRef = useAutoHideScroll<HTMLDivElement>();

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- repõe o formulário ao abrir/trocar de agente, mesmo comportamento do legado
    setActiveTab("geral");
    setForm(agent ? agentConfigToFormData(agent) : createAgentFormDefaults());
    setErrors({});
  }, [open, agent]);

  const set = <K extends keyof AgentConfigFormData>(key: K, value: AgentConfigFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs = validateAgentForm(form, { isEditing, existingNames });
    setErrors(errs);
    if (Object.keys(errs).length > 0) setActiveTab(firstErrorTab(errs));
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch {
      // A página já mostrou "Erro ao cadastrar/salvar" e relançou só para o diálogo continuar
      // aberto; engolir aqui evita a rejeição sem tratamento que o legado deixa no console.
    } finally {
      setSaving(false);
    }
  };

  const nameStatus = agentNameStatus(form.agent_name, { isEditing, existingNames });
  const errorTabs = agentFormErrorTabs(errors);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-lg sm:border">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border bg-muted/30">
          <DialogHeader>
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/15 shrink-0">
                <Server className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg">{isEditing ? "Editar Agente" : "Novo Agente"}</DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs mt-0.5 break-all">
                  {isEditing ? `Editando configuração de ${agent?.agent_name}` : "Preencha os dados para cadastrar um novo agente de serviço"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgentFormTab)} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border bg-background px-2 pb-2 pt-1 sm:px-6 sm:pb-2 sm:pt-1.5">
            <TabsList className="grid h-auto w-full grid-cols-4 gap-1">
              <TabsTrigger value="geral" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <Server className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">Geral{errorTabs.geral && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <Settings2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">API{errorTabs.api && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="contingencia" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <AlertTriangle className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">Conting.{errorTabs.contingencia && <TabBadgeError />}</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex-col gap-0.5 py-2 text-[10px] sm:flex-row sm:gap-1.5 sm:text-xs">
                <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="flex items-center">Sync{errorTabs.sync && <TabBadgeError />}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain autohide-scroll">
            <TabsContent value="geral" className="m-0">
              <AgentFormGeneralTab form={form} errors={errors} isEditing={isEditing} nameStatus={nameStatus} onChange={set} />
            </TabsContent>
            <TabsContent value="api" className="m-0">
              <AgentFormApiTab form={form} errors={errors} onChange={set} />
            </TabsContent>
            <TabsContent value="contingencia" className="m-0">
              <AgentFormContingencyTab form={form} onChange={set} />
            </TabsContent>
            <TabsContent value="sync" className="m-0">
              <AgentFormSyncTab form={form} onChange={set} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="order-2 w-full sm:order-1 sm:w-auto"
            onClick={() => {
              setForm({ ...createAgentFormDefaults(), agent_name: isEditing ? form.agent_name : "" });
              setErrors({});
            }}
            disabled={saving}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Restaurar Padrões
          </Button>
          <div className="order-1 grid w-full grid-cols-2 gap-2 sm:order-2 sm:flex sm:w-auto sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
