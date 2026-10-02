"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Label } from "@/shared/ui/primitives/label";
import { Input } from "@/shared/ui/primitives/input";
import { Switch } from "@/shared/ui/primitives/switch";
import { Button } from "@/shared/ui/primitives/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import { Loader2, QrCode, AlertTriangle } from "lucide-react";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { usePixnopdvStoreCredentials } from "./use-pixnopdv-store-credentials";

/**
 * Cópia fiel de `LEGACY/src/components/totem/PixnopdvStoreCredentialsCard.tsx` — mesmo JSX/classes/
 * textos. A lógica de estado/busca/gravação vive em `use-pixnopdv-store-credentials.ts` (padrão do
 * projeto: hooks do módulo em `ui/`); aqui só a apresentação.
 *
 * Uma divergência deliberada do legado, coberta pela "regra de paridade" da Fase 4: o aviso "Não
 * foi possível resolver a loja" (`isElectronShell()`) foi OMITIDO — é uma mensagem específica do
 * modo desktop Electron, que não existe no Next.
 *
 * `writable` segue o legado em produção — LAN e nuvem gravam (na nuvem, `isCloudSupabaseMode()` do
 * legado é verdadeiro por hostname); ver JSDoc do hook. O aviso "Sem credenciais de produção" volta
 * a ser alcançável na nuvem.
 */
export function PixnopdvStoreCredentialsCard({ embedInPage = false }: { embedInPage?: boolean }) {
  const { backend } = useRuntime();
  const {
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
    onBasicTokenChange,
    secretKeyInput,
    onSecretKeyChange,
    clearBasicToken,
    onClearBasicToken,
    clearSecretKey,
    onClearSecretKey,
    handleSave,
  } = usePixnopdvStoreCredentials();

  if (!writable) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>PIXnoPDV (produção)</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm">
          Disponível no <strong>aplicativo desktop</strong>, com <strong>Admin API</strong> ou em <strong>modo nuvem</strong>.
          Neste ambiente não é possível editar credenciais da loja.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm">
      {!embedInPage ? (
        <CardHeader className="border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="text-sm sm:text-base">PIXnoPDV — credenciais da loja (produção)</CardTitle>
              <CardDescription className="text-[11px] leading-snug sm:text-xs">
                Configuração partilhada por todos os totens desta loja (<code className="rounded bg-muted px-1">store_id</code> em{" "}
                <code className="rounded bg-muted px-1">ecb_sync.site_identity</code>). Apenas ambiente{" "}
                <strong>produção</strong>; homologação fica fora da UI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={`space-y-4 px-4 sm:px-5 ${embedInPage ? "py-6" : "py-4 sm:py-5"}`}>
        {embedInPage ? (
          <p className="text-[11px] text-muted-foreground leading-snug">
            Ambiente <strong>produção</strong> apenas; homologação não é editável aqui. Dados em{" "}
            <code className="rounded bg-muted px-1">pixnopdv_store_credentials</code>.
          </p>
        ) : null}
        {/*
         * ► ISTO É VAZIO, NÃO É FALHA (mesmo texto do legado)
         *
         * `!isError` já diz que a consulta funcionou. `data == null` significa apenas que esta
         * loja ainda não tem credenciais de PRODUÇÃO gravadas.
         */}
        {backend === "cloud" && data == null && !isLoading && !isError && (
          <Alert className="border-primary/30 bg-primary/5 text-foreground [&>svg]:text-primary">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Sem credenciais de produção para esta loja</AlertTitle>
            <AlertDescription className="text-xs">
              Nada foi cadastrado ainda. Preencha os campos abaixo e use <strong>Guardar credenciais</strong> para criar o registro.
            </AlertDescription>
          </Alert>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTitle className="text-sm">Falha ao carregar</AlertTitle>
            <AlertDescription className="text-xs">{error instanceof Error ? error.message : String(error)}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="pixpdv_api_base" className="text-xs">
                URL base da API (opcional)
              </Label>
              <Input
                id="pixpdv_api_base"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.exemplo.com/v1"
                className="font-mono text-xs sm:text-sm"
                disabled={!writable}
              />
              <p className="text-[10px] text-muted-foreground">Vazio → o serviço pode usar <code className="rounded bg-muted px-0.5">PIXPDV_API_BASE_URL</code> no .env.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pixpdv_basic_user" className="text-xs">
                Usuário Basic Auth (opcional)
              </Label>
              <Input
                id="pixpdv_basic_user"
                value={basicUser}
                onChange={(e) => setBasicUser(e.target.value)}
                className="text-xs sm:text-sm"
                autoComplete="off"
                disabled={!writable}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="pixpdv_basic_token" className="text-xs">
                  Token Basic (opcional)
                </Label>
                {data?.basicTokenSet ? (
                  <span className="text-[10px] text-muted-foreground">Valor guardado — deixe vazio para manter</span>
                ) : null}
              </div>
              <Input
                id="pixpdv_basic_token"
                type="password"
                value={basicTokenInput}
                onChange={(e) => onBasicTokenChange(e.target.value)}
                placeholder="••••••••"
                className="font-mono text-xs sm:text-sm"
                autoComplete="new-password"
                disabled={!writable || clearBasicToken}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-fit text-[11px] text-muted-foreground"
                onClick={onClearBasicToken}
                disabled={!writable || (!data?.basicTokenSet && basicTokenInput === "")}
              >
                Limpar token Basic
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="pixpdv_secret_key" className="text-xs">
                  Secret key (opcional)
                </Label>
                {data?.secretKeySet ? (
                  <span className="text-[10px] text-muted-foreground">Valor guardado — deixe vazio para manter</span>
                ) : null}
              </div>
              <Input
                id="pixpdv_secret_key"
                type="password"
                value={secretKeyInput}
                onChange={(e) => onSecretKeyChange(e.target.value)}
                placeholder="••••••••"
                className="font-mono text-xs sm:text-sm"
                autoComplete="new-password"
                disabled={!writable || clearSecretKey}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-fit text-[11px] text-muted-foreground"
                onClick={onClearSecretKey}
                disabled={!writable || (!data?.secretKeySet && secretKeyInput === "")}
              >
                Limpar secret key
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pixpdv_insecure" className="text-xs font-medium">
                  TLS inseguro (dev)
                </Label>
                <p className="text-[10px] text-muted-foreground">Ignorar erros de certificado ao chamar a API.</p>
              </div>
              <Switch id="pixpdv_insecure" checked={insecureTls} onCheckedChange={setInsecureTls} disabled={!writable} />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pixpdv_enabled" className="text-xs font-medium">
                  Integração ativa
                </Label>
                <p className="text-[10px] text-muted-foreground">Quando inativa, o consumidor pode ignorar credenciais da PG.</p>
              </div>
              <Switch id="pixpdv_enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!writable} />
            </div>

            {data?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground">
                Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={!writable}>
                Guardar credenciais
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                Recarregar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
