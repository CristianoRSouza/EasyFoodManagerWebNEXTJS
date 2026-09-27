"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { sessionClient } from "@/shared/session/session-client";

/**
 * Sair encerra a sessão E esvazia o cache: sem isso, o próximo usuário da mesma aba
 * veria por um instante os dados (empresas, lojas, usuário) de quem saiu.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await sessionClient.logout().catch(() => undefined);
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);
}
