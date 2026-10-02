"use client";

import { QrCode } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { PixnopdvStoreCredentialsCard } from "./PixnopdvStoreCredentialsCard";

/**
 * Cópia fiel de `pages/PixnopdvStoreCredentialsPage.tsx` — página fina sobre o cartão do módulo
 * (`PixnopdvStoreCredentialsCard`, Onda 0).
 *
 * A chave de invalidação (`["pixnopdv-store-credentials-producao"]`) é só o PREFIXO usado pelo
 * hook do módulo (`use-pixnopdv-store-credentials.ts`, chave completa
 * `[..., tenant.companyId, tenant.storeId]`) — o TanStack Query casa por prefixo por padrão, então
 * isto invalida a mesma consulta sem duplicar a lógica de tenant aqui. Mesmo truque do legado, que
 * usa a chave curta (`QUERY_KEY = ["pixnopdv-store-credentials-producao"] as const`) direto.
 */
export function PixnopdvPage() {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">PIXnoPDV</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
              Credenciais da loja para produção (partilhadas por todos os totens deste{" "}
              <code className="rounded bg-muted px-1 text-[11px]">store_id</code>)
            </p>
          </div>
        </div>
        <PageRefreshButton
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["pixnopdv-store-credentials-producao"] });
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <PixnopdvStoreCredentialsCard embedInPage />
      </div>
    </div>
  );
}
