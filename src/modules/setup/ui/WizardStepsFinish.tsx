"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import type { WizardForm } from "./use-wizard-form";

/** Passos 5–7 de `LEGACY/src/pages/Wizard.tsx` (JSX, classes e textos copiados). */

type CopyProps = Pick<WizardForm, "copyToClipboard">;

export function StepInstallTest({ copyToClipboard }: CopyProps): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Execute os comandos abaixo no CMD ou PowerShell do servidor:</p>
      {[
        { label: "1. Acesse a pasta do sync-service:", cmd: "cd C:\\EasyCommandPay\\sync-service" },
        { label: "2. Instale as dependências:", cmd: "npm install" },
        { label: "3. Teste a conexão:", cmd: "npm run test-connection" },
      ].map(item => (
        <div key={item.cmd}>
          <p className="text-sm font-medium mb-1">{item.label}</p>
          <div className="flex gap-2">
            <pre className="flex-1 bg-muted p-3 rounded-lg font-mono text-xs">{item.cmd}</pre>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(item.cmd)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
        <h4 className="font-semibold mb-2">Interpretação dos resultados:</h4>
        <div className="space-y-1 text-sm">
          <p><span className="text-success">✅ Firebird connected</span> — Conexão FB OK</p>
          <p><span className="text-success">✅ PostgreSQL connected</span> — Conexão PG OK</p>
          <p><span className="text-destructive">❌ Connection failed</span> — Verifique host, porta, usuário e senha</p>
        </div>
      </div>
    </div>
  );
}

export function StepWindowsService({ copyToClipboard }: CopyProps): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Registre o Sync Service como serviço do Windows para inicialização automática:</p>
      <div>
        <p className="text-sm font-medium mb-1">Instalar como serviço:</p>
        <div className="flex gap-2">
          <pre className="flex-1 bg-muted p-3 rounded-lg font-mono text-xs">npm run install-service</pre>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard("npm run install-service")}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <h4 className="font-semibold mb-2">Verificar no services.msc</h4>
        <p className="text-sm text-muted-foreground">Abra <code className="font-mono bg-muted px-1 rounded">services.msc</code> e procure por &quot;EasyCommandPay Sync&quot;. O serviço deve estar com status &quot;Em execução&quot;.</p>
      </div>
      <div>
        <h4 className="font-semibold mb-2 mt-4">Liberar portas no Firewall</h4>
        {[
          { label: "Porta 3001 (Imagens):", cmd: `New-NetFirewallRule -DisplayName "EasyCommandPay Images" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow` },
          { label: "Porta 5432 (PostgreSQL):", cmd: `New-NetFirewallRule -DisplayName "EasyCommandPay PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow` },
        ].map(item => (
          <div key={item.cmd} className="mb-3">
            <p className="text-sm mb-1">{item.label}</p>
            <div className="flex gap-2">
              <pre className="flex-1 bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">{item.cmd}</pre>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(item.cmd)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepConfirmation(): ReactNode {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold font-heading">Instalação Concluída!</h3>
        <p className="text-muted-foreground mt-2">Verifique o checklist abaixo:</p>
      </div>
      <div className="space-y-2 max-w-md mx-auto">
        {[
          "Node.js instalado",
          "PostgreSQL rodando",
          "Firebird configurado (Srp, WireCrypt)",
          "Arquivo .env configurado",
          "npm install executado",
          "test-connection com sucesso",
          "Serviço Windows instalado",
          "Portas 3001 e 5432 liberadas",
        ].map(item => (
          <div key={item} className="flex items-center gap-3 p-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
      <div className="text-center mt-6">
        {/* Legado: `window.location.href = "/"`; no Next, navegação do App Router para o Dashboard. */}
        <Button variant="default" onClick={() => router.push("/")}>
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  );
}
