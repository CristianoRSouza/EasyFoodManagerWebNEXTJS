"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useToast } from "@/shared/ui/use-toast";
import { usePixnopdvRepository } from "./use-pixnopdv-repository";
import type { PixnopdvStoreCredentialsInput } from "../domain/pixnopdv-store-credentials";

/**
 * Estado e dados do cartão de credenciais PIXnoPDV — mesmo comportamento do legado
 * (`components/totem/PixnopdvStoreCredentialsCard.tsx`), com `useQuery` no lugar do
 * `useState`/`useEffect` manual de busca.
 *
 * `writable`: gravável nos DOIS backends, como o legado em produção. No legado, `writable =
 * isElectronShell() || isAdminApiConfigured() || isCloudSupabaseMode() || isBrowserMockDatasetMode()`.
 * `isCloudApiMode()` não está na lista, mas `isCloudSupabaseMode()` devolve `true` POR HOSTNAME
 * (`*.easysoftcloud.com.br`, `LEGACY/src/lib/cloud-mode.ts#isCloudHostname`) antes de olhar qualquer
 * flag — no Modo 3 de produção as duas detecções de nuvem são verdadeiras ao mesmo tempo, e o save
 * vai por `salvarPixnopdvApi` (`PUT /v1/pixnopdv-store-credentials`). O único caso só-leitura do
 * legado era o Modo 3 fora dos hosts `*.easysoftcloud.com.br` (dev/local), que o Next não tem.
 * Ver fase-4-revisao-final.md, C1.
 */
export function usePixnopdvStoreCredentials() {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const repository = usePixnopdvRepository();

  // Paridade com o legado em produção (ver JSDoc acima): LAN (Admin API) e nuvem (hostname) gravam.
  const writable = backend === "lan" || backend === "cloud";

  const queryKey = useMemo(
    () => ["pixnopdv-store-credentials-producao", tenant.companyId, tenant.storeId] as const,
    [tenant],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => repository.get(),
    staleTime: 30_000,
  });

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [insecureTls, setInsecureTls] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [basicTokenInput, setBasicTokenInput] = useState("");
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [clearBasicToken, setClearBasicToken] = useState(false);
  const [clearSecretKey, setClearSecretKey] = useState(false);

  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- repõe o rascunho do formulário quando os dados recarregam, mesmo comportamento do legado (`PixnopdvStoreCredentialsCard.tsx`)
    setApiBaseUrl(data.apiBaseUrl ?? "");
    setBasicUser(data.basicUser ?? "");
    setInsecureTls(data.insecureTls);
    setEnabled(data.enabled);
    setBasicTokenInput("");
    setSecretKeyInput("");
    setClearBasicToken(false);
    setClearSecretKey(false);
  }, [data]);

  const handleBasicTokenChange = useCallback((value: string) => {
    setBasicTokenInput(value);
    setClearBasicToken(false);
  }, []);

  const handleSecretKeyChange = useCallback((value: string) => {
    setSecretKeyInput(value);
    setClearSecretKey(false);
  }, []);

  const handleClearBasicToken = useCallback(() => {
    setClearBasicToken(true);
    setBasicTokenInput("");
  }, []);

  const handleClearSecretKey = useCallback(() => {
    setClearSecretKey(true);
    setSecretKeyInput("");
  }, []);

  const handleSave = useCallback(async () => {
    const payload: PixnopdvStoreCredentialsInput = {
      apiBaseUrl: apiBaseUrl.trim() === "" ? null : apiBaseUrl.trim(),
      basicUser: basicUser.trim() === "" ? null : basicUser.trim(),
      insecureTls,
      enabled,
    };
    if (clearBasicToken) payload.basicToken = null;
    else if (basicTokenInput.trim() !== "") payload.basicToken = basicTokenInput.trim();

    if (clearSecretKey) payload.secretKey = null;
    else if (secretKeyInput.trim() !== "") payload.secretKey = secretKeyInput.trim();

    try {
      await repository.save(payload);
    } catch (e) {
      toast({
        title: "Erro ao gravar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Credenciais PIXnoPDV guardadas" });
    await queryClient.invalidateQueries({ queryKey });
  }, [apiBaseUrl, basicUser, insecureTls, enabled, clearBasicToken, basicTokenInput, clearSecretKey, secretKeyInput, repository, toast, queryClient, queryKey]);

  return {
    writable,
    data,
    isLoading,
    isError,
    error,
    refetch,
    apiBaseUrl,
    setApiBaseUrl,
    basicUser,
    setBasicUser,
    insecureTls,
    setInsecureTls,
    enabled,
    setEnabled,
    basicTokenInput,
    onBasicTokenChange: handleBasicTokenChange,
    secretKeyInput,
    onSecretKeyChange: handleSecretKeyChange,
    clearBasicToken,
    onClearBasicToken: handleClearBasicToken,
    clearSecretKey,
    onClearSecretKey: handleClearSecretKey,
    handleSave,
  };
}
