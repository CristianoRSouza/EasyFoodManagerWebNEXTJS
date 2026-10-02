/**
 * Lógica pura do Wizard de Instalação do Sync Service (`LEGACY/src/pages/Wizard.tsx`), aproveitada
 * de `REF/src/modules/setup/domain/sync-env.ts`.
 */

export const WIZARD_STEPS = [
  "Pré-requisitos",
  "Bancos de Dados",
  "Conexões",
  "Firebird Config",
  "Instalar e Testar",
  "Serviço Windows",
  "Confirmação",
] as const;

export interface SyncEnvFields {
  fbHost: string;
  fbPort: string;
  fbDatabase: string;
  fbMediaDatabase: string;
  fbUser: string;
  fbPassword: string;
  pgHost: string;
  pgPort: string;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  serverIp: string;
}

/** Valores iniciais dos `useState` do legado. */
export const DEFAULT_SYNC_ENV: SyncEnvFields = {
  fbHost: "localhost",
  fbPort: "3050",
  fbDatabase: "",
  fbMediaDatabase: "",
  fbUser: "SYSDBA",
  fbPassword: "masterkey",
  pgHost: "localhost",
  pgPort: "5432",
  pgDatabase: "easycommandpay",
  pgUser: "postgres",
  pgPassword: "",
  serverIp: "192.168.0.100",
};

/** O `envContent` do legado, byte a byte (senhas entre aspas, sem escape). */
export function buildSyncEnv(f: SyncEnvFields): string {
  return [
    "# Firebird",
    `FB_HOST=${f.fbHost}`,
    `FB_PORT=${f.fbPort}`,
    `FB_DATABASE=${f.fbDatabase}`,
    `FB_MEDIA_DATABASE=${f.fbMediaDatabase}`,
    `FB_USER=${f.fbUser}`,
    `FB_PASSWORD="${f.fbPassword}"`,
    "",
    "# PostgreSQL",
    `PG_HOST=${f.pgHost}`,
    `PG_PORT=${f.pgPort}`,
    `PG_DATABASE=${f.pgDatabase}`,
    `PG_USER=${f.pgUser}`,
    `PG_PASSWORD="${f.pgPassword}"`,
    "",
    "# Servidor",
    `SERVER_IP=${f.serverIp}`,
    "PORT=3001",
    "SYNC_INTERVAL=60000",
  ].join("\n");
}

/**
 * Caminhos dos bancos lidos do IBConfig.INI. Correção de bug do legado (documentada): o legado
 * usava `/Path=(.+)/i` em qualquer lugar da linha, e uma `DataPath=` anterior era capturada no
 * lugar de `Path=`. Aqui a chave é casada no começo da linha.
 */
export function parseIbConfig(text: string): { database: string | null; mediaDatabase: string | null } {
  const value = (key: string) => text.match(new RegExp(`^\\s*${key}\\s*=(.*)$`, "im"))?.[1]?.trim() || null;
  return { database: value("Path"), mediaDatabase: value("Path_Midia") };
}
