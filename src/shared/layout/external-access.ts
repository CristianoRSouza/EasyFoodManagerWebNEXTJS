"use client";

import { useCallback, useState } from "react";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useToast } from "@/shared/ui/use-toast";

export function buildSsoUrl(baseUrl: string, tokenHash: string): string {
  const url = new URL(baseUrl);
  const next = `${url.pathname}${url.search}${url.hash}` || "/";
  const sso = new URL("/sso", `${url.protocol}//${url.host}`);
  sso.searchParams.set("sso_token", tokenHash);
  sso.searchParams.set("sso_type", "magiclink");
  sso.searchParams.set("next", next);
  return sso.toString();
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Tente novamente em instantes.");

/** EasyBilling (Planos, Créditos IA) e suporte. Na loja não há SSO: abre o endereço direto. */
export function useExternalAccess() {
  const { backend, adminPlatformUrl } = useRuntime();
  const { toast } = useToast();
  const [billingLoading, setBillingLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const openAdmin = useCallback(
    async (path: string, errorTitle: string) => {
      if (billingLoading) return;
      setBillingLoading(true);
      try {
        const base = `${adminPlatformUrl}${path}`;
        let target = base;
        if (backend === "cloud") {
          const { token_hash: tokenHash } = await apiRequest<{ token_hash?: string }>("/auth/derived-session", { method: "POST", body: {} });
          if (!tokenHash) throw new Error("O servidor não devolveu o link de acesso.");
          target = buildSsoUrl(base, tokenHash);
        }
        window.open(target, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast({ title: errorTitle, description: errorMessage(error), variant: "destructive" });
      } finally {
        setBillingLoading(false);
      }
    },
    [adminPlatformUrl, backend, billingLoading, toast],
  );

  const openSupport = useCallback(async () => {
    if (supportLoading) return;
    if (backend !== "cloud") {
      toast({ title: "Suporte indisponível", description: "Indisponível nesta instalação.", variant: "destructive" });
      return;
    }
    setSupportLoading(true);
    const popup = window.open("about:blank", "_blank");
    try {
      const { redirect_url: redirectUrl } = await apiRequest<{ redirect_url?: string }>("/auth/sso/support", { method: "POST", body: {} });
      if (!redirectUrl) throw new Error("Falha ao gerar acesso ao suporte.");
      if (popup) popup.location.href = redirectUrl;
      else window.location.href = redirectUrl;
    } catch (error) {
      popup?.close();
      toast({ title: "Suporte indisponível", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSupportLoading(false);
    }
  }, [backend, supportLoading, toast]);

  return {
    openBilling: () => openAdmin("/modules/easycommandpay", "Não foi possível abrir o EasyBilling"),
    openAiCredits: () => openAdmin("/ai-credits", "Não foi possível abrir os Créditos IA"),
    openSupport,
    billingLoading,
    supportLoading,
  };
}
