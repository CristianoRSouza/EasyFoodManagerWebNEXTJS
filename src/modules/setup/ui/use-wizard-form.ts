"use client";

import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useToast } from "@/shared/ui/use-toast";
import { buildSyncEnv, DEFAULT_SYNC_ENV, parseIbConfig, type SyncEnvFields } from "../domain/sync-env";

/** Estado e ações do formulário de `LEGACY/src/pages/Wizard.tsx`. */
export function useWizardForm() {
  const { toast } = useToast();
  const [fields, setFields] = useState<SyncEnvFields>(DEFAULT_SYNC_ENV);

  const setField = useCallback((key: keyof SyncEnvFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = typeof ev.target?.result === "string" ? ev.target.result : "";
        const { database, mediaDatabase } = parseIbConfig(text);
        setFields((prev) => ({
          ...prev,
          ...(database !== null ? { fbDatabase: database } : {}),
          ...(mediaDatabase !== null ? { fbMediaDatabase: mediaDatabase } : {}),
        }));
        toast({ title: "IBConfig.INI carregado!", description: "Caminhos dos bancos preenchidos automaticamente." });
      };
      reader.readAsText(file);
    },
    [toast],
  );

  const copyToClipboard = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text);
      toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." });
    },
    [toast],
  );

  const envContent = useMemo(() => buildSyncEnv(fields), [fields]);

  return { fields, setField, handleFileUpload, copyToClipboard, envContent };
}

export type WizardForm = ReturnType<typeof useWizardForm>;
