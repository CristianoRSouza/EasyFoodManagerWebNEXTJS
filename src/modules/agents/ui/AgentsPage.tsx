"use client";

import { Server, Plus, Power, Shield } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { AgentCard } from "./AgentCard";
import { SummaryCard } from "@/shared/ui/SummaryCard";
import { AgentFormDialog } from "./AgentFormDialog";
import { AgentAuditDialog } from "./AgentAuditDialog";
import { useAgentsPage } from "./use-agents-page";

/** Cópia fiel de `pages/AgentConfigPage.tsx`, com o estado centralizado em `use-agents-page.ts`. */
export function AgentsPage() {
  const {
    agents, isLoading, refetch, activeCount, contingencyCount,
    dialogOpen, setDialogOpen, editingAgent, openCreate, openEdit,
    auditOpen, setAuditOpen, auditAgent, openAudit,
    handleCreate, handleUpdate, handleToggle,
  } = useAgentsPage();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 shrink-0">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Agentes de Serviço</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
              Configuração operacional das instâncias NFC-e Service
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button onClick={openCreate} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Novo Agente
          </Button>
          <PageRefreshButton onClick={() => { refetch(); }} />
        </div>
      </div>

      {/* Summary cards */}
      {agents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <SummaryCard icon={Server} label="Total" value={agents.length} color="text-primary" />
          <SummaryCard
            icon={Power}
            label="Ativos"
            value={activeCount}
            color="text-emerald-500"
            subtitle={`${agents.length - activeCount} inativos`}
          />
          <SummaryCard
            icon={Shield}
            label="Em Contingência"
            value={contingencyCount}
            color={contingencyCount > 0 ? "text-destructive" : "text-muted-foreground"}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground text-sm animate-pulse">Carregando…</p>
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted">
              <Server className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum agente cadastrado</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar primeiro agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onEdit={() => openEdit(a)}
              onAudit={() => openAudit(a)}
              onToggle={(v) => handleToggle(a, v)}
            />
          ))}
        </div>
      )}

      <AgentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editingAgent}
        existingNames={agents.map((a) => a.agent_name)}
        onSubmit={editingAgent ? handleUpdate : handleCreate}
      />

      <AgentAuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        agentId={auditAgent?.id ?? null}
        agentName={auditAgent?.agent_name ?? ""}
      />
    </div>
  );
}
