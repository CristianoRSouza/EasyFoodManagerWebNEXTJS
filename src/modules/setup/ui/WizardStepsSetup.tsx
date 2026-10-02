"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Circle, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import type { SyncEnvFields } from "../domain/sync-env";
import type { WizardForm } from "./use-wizard-form";

/** Passos 1–4 de `LEGACY/src/pages/Wizard.tsx` (JSX, classes e textos copiados). */

export function StepPrerequisites({ copyToClipboard }: Pick<WizardForm, "copyToClipboard">): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Verifique se os seguintes pré-requisitos estão instalados no servidor:</p>
      <div className="space-y-3">
        {[
          { name: "Node.js 20+ LTS", link: "https://nodejs.org/", desc: "Runtime JavaScript para o Sync Service" },
          { name: "Firebird 3.0+", link: "https://firebirdsql.org/", desc: "Banco de dados legado do ERP" },
          { name: "PostgreSQL 14+", link: "https://www.postgresql.org/download/", desc: "Banco de dados principal" },
        ].map(item => (
          <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <a href={item.link} target="_blank" rel="noopener" className="text-primary text-sm flex items-center gap-1 hover:underline">
              Download <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Sync Service</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-2">Clone ou baixe o repositório:</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-muted p-2 rounded font-mono text-xs">https://github.com/NeanderEasySoft/easy-command-pay.git</code>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard("git clone https://github.com/NeanderEasySoft/easy-command-pay.git")}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Extraia para: <code className="font-mono bg-muted px-1 rounded">C:\EasyCommandPay\sync-service</code></p>
      </div>
    </div>
  );
}

export function StepDatabases({ fields, setField, handleFileUpload }: Pick<WizardForm, "fields" | "setField" | "handleFileUpload">): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Localize os bancos de dados Firebird. Você pode carregar o IBConfig.INI automaticamente:</p>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <Label className="mb-2 block font-medium">Carregar IBConfig.INI</Label>
        <p className="text-xs text-muted-foreground mb-3">Arquivo geralmente em: <code className="font-mono bg-muted px-1 rounded">C:\Users\Public\EasySoft\Executaveis\IBConfig.INI</code></p>
        <Input type="file" accept=".ini,.INI" onChange={handleFileUpload} />
      </div>
      <div className="space-y-3">
        <div>
          <Label>Caminho do Banco Principal (FB_DATABASE)</Label>
          <Input value={fields.fbDatabase} onChange={e => setField("fbDatabase", e.target.value)} placeholder="C:\caminho\NOVOBANCO.FDB" className="font-mono" />
        </div>
        <div>
          <Label>Caminho do Banco de Mídias (FB_MEDIA_DATABASE)</Label>
          <Input value={fields.fbMediaDatabase} onChange={e => setField("fbMediaDatabase", e.target.value)} placeholder="C:\caminho\MIDIAS.FDB" className="font-mono" />
        </div>
      </div>
    </div>
  );
}

type FieldProps = Pick<WizardForm, "fields" | "setField">;

function Field({ fields, setField, name, label, type, placeholder }: FieldProps & { name: keyof SyncEnvFields; label: string; type?: string; placeholder?: string }): ReactNode {
  return (
    <div><Label>{label}</Label><Input type={type} value={fields[name]} onChange={e => setField(name, e.target.value)} placeholder={placeholder} /></div>
  );
}

export function StepConnections({ fields, setField, envContent, copyToClipboard }: Pick<WizardForm, "fields" | "setField" | "envContent" | "copyToClipboard">): ReactNode {
  const f = { fields, setField };
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-3">Conexão Firebird</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field {...f} name="fbHost" label="Host" />
          <Field {...f} name="fbPort" label="Porta" />
          <Field {...f} name="fbUser" label="Usuário" />
          <Field {...f} name="fbPassword" label="Senha" type="password" />
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Conexão PostgreSQL</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field {...f} name="pgHost" label="Host" />
          <Field {...f} name="pgPort" label="Porta" />
          <Field {...f} name="pgDatabase" label="Banco" />
          <Field {...f} name="pgUser" label="Usuário" />
          <Field {...f} name="pgPassword" label="Senha" type="password" />
          <Field {...f} name="serverIp" label="IP do Servidor (rede)" placeholder="192.168.0.100" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Arquivo .env gerado</h4>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(envContent)}>
            <Copy className="h-3 w-3 mr-1" /> Copiar .env
          </Button>
        </div>
        <pre className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap">{envContent}</pre>
      </div>
    </div>
  );
}

export function StepFirebirdConfig({ copyToClipboard }: Pick<WizardForm, "copyToClipboard">): ReactNode {
  return (
    <div className="space-y-4">
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h4 className="font-semibold text-warning">Configuração obrigatória</h4>
        </div>
        <p className="text-sm text-muted-foreground">Sem estas alterações, a conexão com o Firebird não funcionará.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm">Localize o arquivo <code className="font-mono bg-muted px-1 rounded">firebird.conf</code>:</p>
        <pre className="bg-muted p-3 rounded-lg font-mono text-xs">C:\Program Files\Firebird\Firebird_3_0\firebird.conf</pre>

        <p className="text-sm font-medium mt-4">Altere as seguintes linhas:</p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Busque por AuthServer e altere para:</p>
            <pre className="font-mono text-sm text-primary">AuthServer = Srp, Srp256</pre>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Busque por WireCrypt e altere para:</p>
            <pre className="font-mono text-sm text-primary">WireCrypt = Enabled</pre>
          </div>
        </div>

        <p className="text-sm mt-4 font-medium">Após as alterações, reinicie o serviço Firebird:</p>
        <div className="flex gap-2">
          <pre className="flex-1 bg-muted p-3 rounded-lg font-mono text-xs">net stop FirebirdServerDefaultInstance && net start FirebirdServerDefaultInstance</pre>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard("net stop FirebirdServerDefaultInstance && net start FirebirdServerDefaultInstance")}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
