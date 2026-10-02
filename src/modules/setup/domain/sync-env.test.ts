import { buildSyncEnv, DEFAULT_SYNC_ENV, parseIbConfig, WIZARD_STEPS } from "./sync-env";

describe("buildSyncEnv", () => {
  it("gera exatamente o .env do legado com os valores padrão", () => {
    expect(buildSyncEnv(DEFAULT_SYNC_ENV)).toBe(`# Firebird
FB_HOST=localhost
FB_PORT=3050
FB_DATABASE=
FB_MEDIA_DATABASE=
FB_USER=SYSDBA
FB_PASSWORD="masterkey"

# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=easycommandpay
PG_USER=postgres
PG_PASSWORD=""

# Servidor
SERVER_IP=192.168.0.100
PORT=3001
SYNC_INTERVAL=60000`);
  });

  it("senhas entre aspas, sem escapar nada", () => {
    const env = buildSyncEnv({ ...DEFAULT_SYNC_ENV, fbPassword: "a#b", pgPassword: "c:\\x" });
    expect(env).toContain('FB_PASSWORD="a#b"');
    expect(env).toContain('PG_PASSWORD="c:\\x"');
  });
});

describe("parseIbConfig", () => {
  it("lê Path e Path_Midia (CRLF), com trim", () => {
    const ini = "[Config]\r\nPath=C:\\Dados\\NOVOBANCO.FDB \r\nPath_Midia=C:\\Dados\\MIDIAS.FDB\r\n";
    expect(parseIbConfig(ini)).toEqual({ database: "C:\\Dados\\NOVOBANCO.FDB", mediaDatabase: "C:\\Dados\\MIDIAS.FDB" });
  });

  it("não confunde DataPath= anterior com Path= (bug do legado)", () => {
    const ini = "DataPath=C:\\ERRADO.FDB\nPath=C:\\CERTO.FDB";
    expect(parseIbConfig(ini).database).toBe("C:\\CERTO.FDB");
  });

  it("chave ausente vira null; sem diferenciar maiúsculas", () => {
    expect(parseIbConfig("path=C:\\D.FDB")).toEqual({ database: "C:\\D.FDB", mediaDatabase: null });
    expect(parseIbConfig("qualquer coisa")).toEqual({ database: null, mediaDatabase: null });
  });
});

describe("WIZARD_STEPS", () => {
  it("os 7 passos do legado", () => {
    expect(WIZARD_STEPS).toHaveLength(7);
    expect(WIZARD_STEPS[0]).toBe("Pré-requisitos");
    expect(WIZARD_STEPS[6]).toBe("Confirmação");
  });
});
