"use client";

import type { ReactNode } from "react";
import { KeyRound, Copy, Check, Loader2, ShieldAlert, Store as StoreIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { formatDateTime } from "@/shared/format/date-time";
import { useBootstrapCodesForm } from "./use-bootstrap-codes-form";

const HEADER = (
  <div>
    <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
      <KeyRound className="h-5 w-5 text-primary" /> Códigos de primeiro acesso
    </h1>
    <p className="text-sm text-muted-foreground mt-1">
      Gere um código para um usuário definir a senha local no POS pela primeira vez.
    </p>
  </div>
);

/**
 * Porta de `LEGACY/src/pages/BootstrapCodePage.tsx`. Só existe no modo nuvem — o legado usa
 * `isCloudSupabaseMode()` (detecção específica do bundle do navegador legado) para o mesmo
 * gate; aqui usamos `useRuntime().backend === "cloud"`, o equivalente já estabelecido no Next
 * (mesmo sinal que `buildNavGroups` usa para só listar este item no menu em modo nuvem — ver
 * `src/shared/layout/nav-items.ts`). O texto e o cartão do estado "não é nuvem" são copiados
 * verbatim do legado (é o único estado equivalente que ele tem para modo não-nuvem).
 */
export function BootstrapCodesPage(): ReactNode {
  const { backend } = useRuntime();
  const cloud = backend === "cloud";

  if (!cloud) {
    return (
      <div className="space-y-6">
        {HEADER}
        <Card className="glass-panel">
          <CardContent className="p-8 text-center text-muted-foreground">
            Esta função está disponível apenas no modo Nuvem (painel Supabase).
          </CardContent>
        </Card>
      </div>
    );
  }

  return <BootstrapCodesCloudContent />;
}

function BootstrapCodesCloudContent(): ReactNode {
  const { selectedStoreId, selectedStore, selectedCompany, canGenerate } = useBootstrapTenantInfo();
  const { email, setEmail, generating, result, copied, generate, copy } = useBootstrapCodesForm();

  if (!canGenerate) {
    return (
      <div className="space-y-6">
        {HEADER}
        <Card className="glass-panel border-l-4 border-l-destructive">
          <CardContent className="p-6 flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <span>Apenas administradores da empresa/loja podem gerar códigos de primeiro acesso.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // `??`, não `||`: igual ao legado (`BootstrapCodePage.tsx`) — `trade_name: ""` fica vazio.
  const storeLabel = selectedStore?.trade_name ?? selectedStoreId ?? "—";

  return (
    <div className="space-y-6">
      {HEADER}

      <Card className="glass-panel max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Gerar código</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <StoreIcon className="h-3.5 w-3.5" />
            Loja: <span className="font-medium text-foreground">{storeLabel}</span>
            {selectedCompany?.name ? <span className="text-muted-foreground">· {selectedCompany.name}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bootstrap-code-email">Email do usuário</Label>
            <Input
              id="bootstrap-code-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="funcionario@empresa.com"
              disabled={generating}
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              O código só funciona para este email e para esta loja, e expira em 48 horas.
            </p>
          </div>
          <Button onClick={generate} disabled={generating || !selectedStoreId} className="w-full sm:w-auto">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {generating ? "Gerando…" : "Gerar código"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card className="glass-panel max-w-2xl border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-base">Código gerado</CardTitle>
            <CardDescription>
              Para <span className="font-medium text-foreground">{result.email}</span>
              {result.expiresAt ? <> · expira em {formatDateTime(result.expiresAt)}</> : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <code className="flex-1 break-all rounded-md bg-muted/60 px-3 py-2 font-mono text-xs leading-relaxed">
                {result.code}
              </code>
              <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5">{copied ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
              Entregue este código ao usuário (ele o cola na tela de primeiro acesso do POS). Ele é
              mostrado só desta vez e vale por uma única definição de senha — depois disso, deixa de
              funcionar. Não o envie por canais públicos.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Equivalente a `useCompanyStore()` no legado, recortado ao que esta tela precisa. */
function useBootstrapTenantInfo() {
  const { selection, selectedStore, selectedCompany, isSystemAdmin, isCompanyAdmin } = useTenant();
  return {
    selectedStoreId: selection?.storeId ?? null,
    selectedStore,
    selectedCompany,
    canGenerate: isSystemAdmin || isCompanyAdmin,
  };
}
