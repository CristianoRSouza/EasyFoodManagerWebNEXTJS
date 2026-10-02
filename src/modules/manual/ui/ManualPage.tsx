"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/ui/primitives/accordion";
import { Button } from "@/shared/ui/primitives/button";

/**
 * Porta de `LEGACY/src/pages/Manual.tsx` — conteúdo estático; JSX, classes e textos copiados.
 * Única troca: `Link` do react-router (`to`) → `next/link` (`href`).
 */
export function ManualPage(): ReactNode {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold font-heading">Manual do Sistema</h1>

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="overview" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Visão Geral — Arquitetura</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <p>O EasyFoodManager é composto por:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Totens (Electron)</strong> — Terminais de autoatendimento para pedidos dos clientes</li>
              <li><strong>Servidor Windows</strong> — Roda o Sync Service, PostgreSQL e serve imagens</li>
              <li><strong>PostgreSQL</strong> — Banco de dados central com produtos, comandas e transações</li>
              <li><strong>Firebird</strong> — Banco legado do ERP que é sincronizado bidirecionalmente</li>
              <li><strong>Sync Service</strong> — Serviço Node.js que mantém FB ↔ PG sincronizados</li>
            </ul>
            <p>Fluxo: Totem → PostgreSQL → Sync Service → Firebird (e vice-versa)</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="requirements" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Requisitos do Sistema</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Servidor</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Windows 10/11 ou Windows Server 2016+</li>
                <li>4GB RAM mínimo (8GB recomendado)</li>
                <li>Node.js 20+ LTS</li>
                <li>PostgreSQL 14+</li>
                <li>Firebird 3.0+</li>
                <li>Portas 3001 e 5432 liberadas no firewall</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Totem</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Windows 10/11</li>
                <li>Tela touch 15&quot; ou superior</li>
                <li>Rede local com acesso ao servidor</li>
                <li>Resolução mínima 1024x768</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pg-install" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Instalação do PostgreSQL</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <h4 className="font-semibold text-foreground">Windows</h4>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Baixe o instalador em <code className="font-mono bg-muted px-1 rounded">postgresql.org/download/windows</code></li>
              <li>Execute o instalador, defina senha do superusuário</li>
              <li>Crie o banco <code className="font-mono bg-muted px-1 rounded">easycommandpay</code></li>
            </ol>
            <h4 className="font-semibold text-foreground mt-3">Configuração de Rede</h4>
            <p>Edite <code className="font-mono bg-muted px-1 rounded">postgresql.conf</code>:</p>
            <pre className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">listen_addresses = &apos;*&apos;{'\n'}port = 5432</pre>
            <p>Edite <code className="font-mono bg-muted px-1 rounded">pg_hba.conf</code>:</p>
            <pre className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">host all all 192.168.0.0/24 scram-sha-256</pre>
            <p>Libere a porta 5432 no Firewall do Windows.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sync-service" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Sync Service (Firebird ↔ PostgreSQL)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <h4 className="font-semibold text-foreground">Pré-requisitos</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Node.js 20+ LTS instalado</li>
              <li>Firebird 3.0+ com banco acessível</li>
              <li>PostgreSQL rodando com banco <code className="font-mono bg-muted px-1 rounded">easycommandpay</code></li>
            </ul>

            <h4 className="font-semibold text-foreground mt-3">Instalação</h4>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Copie a pasta <code className="font-mono bg-muted px-1 rounded">sync-service</code> para <code className="font-mono bg-muted px-1 rounded">C:\EasyCommandPay\sync-service</code></li>
              <li>Configure o arquivo <code className="font-mono bg-muted px-1 rounded">.env</code> com os caminhos dos bancos Firebird</li>
              <li>Corrija o <code className="font-mono bg-muted px-1 rounded">firebird.conf</code>: <code className="font-mono bg-muted px-1 rounded">AuthServer = Srp, Srp256</code> e <code className="font-mono bg-muted px-1 rounded">WireCrypt = Enabled</code></li>
              <li>Execute: <code className="font-mono bg-muted px-1 rounded">npm install</code></li>
              <li>Teste: <code className="font-mono bg-muted px-1 rounded">npm run test-connection</code></li>
              <li>Instale como serviço: <code className="font-mono bg-muted px-1 rounded">npm run install-service</code></li>
            </ol>

            <h4 className="font-semibold text-foreground mt-3">Portas no Firewall</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Porta <strong>3001</strong> — Servidor de imagens</li>
              <li>Porta <strong>5432</strong> — PostgreSQL</li>
            </ul>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3">
              <p className="text-warning font-medium text-xs">⚠ Senhas com caracteres especiais (#, @) devem usar aspas duplas no arquivo .env</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sync-installer" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Instalador do Sync</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <p>
              Use o wizard para gerar e validar os arquivos de instalação do Sync Service com as configurações do ambiente atual.
            </p>
            <Button asChild size="sm" className="w-fit">
              <Link href="/wizard">Abrir instalador do Sync</Link>
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="totem" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Configuração do Totem Electron</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <ol className="list-decimal pl-6 space-y-1">
              <li>Instale o aplicativo Electron do Totem no terminal</li>
              <li>Configure o endereço do servidor PostgreSQL no arquivo de configuração</li>
              <li>Configure o IP do servidor de imagens (porta 3001)</li>
              <li>Teste a conexão com o servidor</li>
              <li>Configure o modo kiosk para produção</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="network" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Rede e Firewall</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <p>Certifique-se de que:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Todos os dispositivos estão na mesma rede local</li>
              <li>O servidor tem IP fixo configurado</li>
              <li>Portas 3001 (imagens) e 5432 (PostgreSQL) estão liberadas</li>
              <li>O perfil de rede está configurado como &quot;Privado&quot; no Windows</li>
              <li>Regras de entrada no Windows Firewall permitem tráfego TCP nas portas acima</li>
            </ul>
            <pre className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto mt-2">{`# PowerShell - Liberar portas
New-NetFirewallRule -DisplayName "EasyCommandPay - Images" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "EasyCommandPay - PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow`}</pre>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tef-http-service" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Serviço TEF (HTTP — Aditum)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <p>
              O <strong>EasyCommandPay-TEF-Aditum-Service</strong> escuta na porta configurada em <code className="font-mono bg-muted px-1 rounded">HTTP_PORT</code> (padrão <strong>3090</strong>) e expõe proxies para o runtime Aditum além do fluxo síncrono de cobrança por transação no PostgreSQL.
            </p>
            <h4 className="font-semibold text-foreground">Autenticação</h4>
            <p>
              Se <code className="font-mono bg-muted px-1 rounded">HTTP_API_KEY</code> estiver definido no <code className="font-mono bg-muted px-1 rounded">.env</code> do serviço TEF, todas as requisições (exceto <code className="font-mono bg-muted px-1 rounded">OPTIONS</code>) devem enviar o cabeçalho <strong>X-Api-Key</strong>. O Admin resolve a base URL e a chave conforme emitente NFC-e, totem ou <code className="font-mono bg-muted px-1 rounded">.env</code> do próprio Admin — ver também <code className="font-mono bg-muted px-1 rounded">docs/admin-tef-http.md</code>.
            </p>
            <h4 className="font-semibold text-foreground">Rotas principais</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><code className="font-mono bg-muted px-1 rounded">GET /health</code> — saúde do serviço Node</li>
              <li><code className="font-mono bg-muted px-1 rounded">GET /v1/tef/diagnostics</code> — diagnóstico (rede, TLS, token, sonda <code className="font-mono text-xs">/v2/status</code>)</li>
              <li><code className="font-mono bg-muted px-1 rounded">GET /v1/tef/status</code>, <code className="font-mono bg-muted px-1 rounded">GET /v1/tef/abort</code>, <code className="font-mono bg-muted px-1 rounded">GET /v1/tef/merchant/settings</code></li>
              <li><code className="font-mono bg-muted px-1 rounded">POST /v1/tef/pinpad/init</code> — corpo JSON opcional</li>
              <li><code className="font-mono bg-muted px-1 rounded">GET /v1/tef/charge/pending</code> — query <code className="font-mono text-xs">currentPage</code>, <code className="font-mono text-xs">pageSize</code></li>
              <li><code className="font-mono bg-muted px-1 rounded">GET /v1/tef/charge/by-nsu/&#123;nsu&#125;</code>, cancelamento, reversão e confirmação por NSU sob <code className="font-mono text-xs">/v1/tef/charge/…</code></li>
              <li><code className="font-mono bg-muted px-1 rounded">GET /v1/transactions/&#123;uuid&#125;</code> e <code className="font-mono bg-muted px-1 rounded">POST …/charge</code> (ou <code className="font-mono text-xs">POST /v1/transactions/charge</code> com <code className="font-mono text-xs">transactionId</code> no JSON) — exige PostgreSQL no serviço TEF</li>
            </ul>
            <p className="text-xs">
              Documentação completa com tabelas e exemplos <code className="font-mono bg-muted px-1 rounded">curl</code>: arquivo <strong>docs/MANUAL-TEF-SERVICO-HTTP.md</strong> na pasta do projeto Admin Desktop (incluir em distribuições internas ou abrir no repositório).
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="dns-config" className="glass-panel rounded-lg border px-4">
          <AccordionTrigger className="font-heading font-semibold">Configuração de DNS (Domínio Customizado)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
            <p>
              Para publicar o EasyFoodManager em um domínio próprio (ex.: <code className="font-mono bg-muted px-1 rounded">manager.easysoftcloud.com.br</code>),
              cadastre os registros DNS abaixo no provedor do domínio (Registro.br, Cloudflare, etc.) e aguarde a propagação (pode levar até 72h).
            </p>

            <h4 className="font-semibold text-foreground mt-3">Registros necessários</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Tipo</th>
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Nome / Host</th>
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-2 font-mono">A</td>
                    <td className="py-2 px-2 font-mono break-all">manager.easysoftcloud.com.br</td>
                    <td className="py-2 px-2 font-mono break-all">185.158.133.1</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-2 font-mono">TXT</td>
                    <td className="py-2 px-2 font-mono break-all">_lovable.manager.easysoftcloud.com.br</td>
                    <td className="py-2 px-2 font-mono break-all">lovable_verify=0390d4a110bfdd47a098805aed2b9e9559cc864619b193071fe9738bea92fd00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold text-foreground mt-3">Observações</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>O registro <strong>A</strong> aponta o subdomínio para o IP da plataforma de hospedagem (Lovable).</li>
              <li>O registro <strong>TXT</strong> (<code className="font-mono bg-muted px-1 rounded">_lovable.&lt;subdomínio&gt;</code>) comprova a propriedade do domínio.</li>
              <li>O SSL (HTTPS) é provisionado automaticamente após a verificação dos registros.</li>
              <li>Para verificar a propagação, use <a href="https://dnschecker.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">dnschecker.org</a> ou <code className="font-mono bg-muted px-1 rounded">dig manager.easysoftcloud.com.br</code>.</li>
              <li>Caso utilize Cloudflare ou proxy similar, desative o modo &quot;proxiado&quot; (nuvem laranja) durante a verificação inicial.</li>
            </ul>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3">
              <p className="text-warning font-medium text-xs">⚠ Não remova o registro TXT após a verificação — ele é revalidado periodicamente.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
