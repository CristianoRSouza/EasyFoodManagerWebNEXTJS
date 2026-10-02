"use client";

import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { MobileStickyActionBar } from "@/shared/ui/issuer-sections/MobileStickyActionBar";
import { NfceIssuerSectionNav } from "@/shared/ui/issuer-sections/NfceIssuerSectionNav";
import { useIssuerPage } from "./use-issuer-page";
import { IssuerStatusHeader } from "./IssuerStatusHeader";
import { IssuerMainGrid } from "./IssuerMainGrid";
import { IssuerInfCplCard } from "./IssuerInfCplCard";
import { IssuerTefCard } from "./IssuerTefCard";
import { IssuerEasyerpCard } from "./IssuerEasyerpCard";
import { IssuerCertificateCard } from "./IssuerCertificateCard";
import { AcbrConfigTable } from "./AcbrConfigTable";

const CLOUD_WARN = "Sem dados na nuvem para este campo. Disponível apenas no modo local (Electron / Admin API).";

// Legado 1.3.12 (PRs #36-#38): IE ST, textos infCpl, TEF Admin e certificado só mostram o aviso
// "sem dados na nuvem" no caminho Supabase direto (`fiscalDaLojaSemFonte = cloudMode &&
// !isCloudApiMode()`). A nuvem do Next é sempre a EasyFood API — esse caminho não existe aqui, então
// o aviso sobrevive apenas no título do card TEF Aditum (que no legado continua em `cloudMode`).

/**
 * Emitente NFC-e (`/nfce-issuer`) — cópia fiel de `LEGACY/src/pages/NfceIssuerConfigPage.tsx`,
 * leitura e edição.
 *
 * O legado só mostra "Editar" com `isElectron()` (Electron desktop). O Next substitui o app
 * Electron, então `canEdit` (backend "lan") ocupa o papel que lá era do Electron — sem isso, as
 * lojas perderiam a única forma de editar o cadastro do emitente. Ver decisão detalhada em
 * `docs/superpowers/plans/fase-3-emitente-report.md`.
 */
export function IssuerPage() {
  const {
    configs,
    acbrConfigs,
    loading,
    refreshing,
    cloudMode,
    canEdit,
    handleRefresh,
    editingId,
    draft,
    saving,
    startEditing,
    cancelEditing,
    handleFieldChange,
    handleSave,
  } = useIssuerPage();

  const header = (
    <NfceIssuerSectionNav
      active="issuer"
      description="Parte 1 de 2 · Cadastro do emitente, certificado digital e parâmetros do ACBr."
      actions={<PageRefreshButton onClick={handleRefresh} refreshing={refreshing} />}
    />
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex h-64 items-center justify-center">
          <span className="animate-pulse text-muted-foreground">Carregando cadastro do emitente...</span>
        </div>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="glass-panel">
          <CardContent className="p-8 text-center text-muted-foreground">Nenhuma configuração de emitente encontrada.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {configs.map((config, index) => {
        const editing = editingId === config.id;
        return (
          <div key={config.id} className="space-y-5">
            <IssuerStatusHeader
              config={config}
              canEdit={canEdit}
              editing={editing}
              saving={saving}
              onEdit={() => startEditing(config)}
              onCancel={cancelEditing}
              onSave={handleSave}
            />
            <IssuerMainGrid config={config} editing={editing} draft={draft} onFieldChange={handleFieldChange} />
            <IssuerInfCplCard config={config} editing={editing} draft={draft} onFieldChange={handleFieldChange} />
            <IssuerTefCard
              config={config}
              isFirst={index === 0}
              cloudMode={cloudMode}
              cloudWarn={CLOUD_WARN}
              editing={editing}
              draft={draft}
              onFieldChange={handleFieldChange}
            />
            <IssuerEasyerpCard config={config} editing={editing} draft={draft} onFieldChange={handleFieldChange} />
            <IssuerCertificateCard config={config} editing={editing} draft={draft} onFieldChange={handleFieldChange} />

            {canEdit && !editing && (
              <>
                <div aria-hidden className="md:hidden h-16" />
                <MobileStickyActionBar>
                  <Button variant="default" size="sm" onClick={() => startEditing(config)} className="w-full">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar configuração
                  </Button>
                </MobileStickyActionBar>
              </>
            )}
            {editing && (
              <>
                <div aria-hidden className="md:hidden h-16" />
                <MobileStickyActionBar>
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving} className="flex-1">
                    <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </MobileStickyActionBar>
              </>
            )}
          </div>
        );
      })}

      <AcbrConfigTable acbrConfigs={acbrConfigs} />
    </div>
  );
}
