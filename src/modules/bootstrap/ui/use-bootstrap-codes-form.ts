"use client";

import { useState } from "react";
import { useToast } from "@/shared/ui/use-toast";
import { isValidBootstrapEmail, normalizeBootstrapEmail } from "../domain/bootstrap-code";
import { useBootstrapCodeRepository } from "./use-bootstrap-code-repository";

export interface BootstrapCodeGenerated {
  code: string;
  email: string;
  expiresAt: string;
}

/**
 * Estado e ações da tela — porta de `generate`/`copy` em `LEGACY/src/pages/BootstrapCodePage.tsx`.
 * Separado da página para poder testar os estados (carregando, sucesso, erro) sem montar o
 * `TenantProvider`/`QueryClientProvider` inteiro (mesmo padrão de `use-units-query.ts`).
 */
export function useBootstrapCodesForm() {
  const { toast } = useToast();
  const repository = useBootstrapCodeRepository();

  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BootstrapCodeGenerated | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    const normalized = normalizeBootstrapEmail(email);
    if (!isValidBootstrapEmail(normalized)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResult(null);
    setCopied(false);
    try {
      const r = await repository.issue({ email: normalized });
      if (!r.ok || !r.code) {
        toast({
          title: "Não foi possível gerar o código",
          description: r.error ?? "Erro desconhecido.",
          variant: "destructive",
        });
        return;
      }
      setResult({ code: r.code, email: r.email ?? normalized, expiresAt: r.expiresAt ?? "" });
    } catch (e) {
      toast({
        title: "Falha ao gerar o código",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return { email, setEmail, generating, result, copied, generate, copy };
}
