import { describe, expect, it } from "vitest";
import { toSyncLog } from "./sync-log-mapper";

describe("toSyncLog", () => {
  it("converte a linha de `SELECT * FROM sync_log` (GET /v1/sync/logs)", () => {
    expect(
      toSyncLog({
        id: 12,
        direction: "fb_to_pg",
        table_name: "products",
        records_affected: "5",
        record_id: null,
        status: "success",
        error_message: null,
        created_at: "2024-01-01T07:50:00Z",
      }),
    ).toEqual({
      id: "12",
      direction: "fb_to_pg",
      tableName: "products",
      recordsAffected: 5,
      recordId: null,
      status: "success",
      errorMessage: null,
      createdAt: "2024-01-01T07:50:00Z",
    });
  });

  it("campos ausentes não viram \"undefined\"", () => {
    expect(toSyncLog({})).toEqual({
      id: "",
      direction: "",
      tableName: "",
      recordsAffected: 0,
      recordId: null,
      status: "",
      errorMessage: null,
      createdAt: "",
    });
  });

  it("mensagem de erro vazia é tratada como ausente (a tabela mostra —)", () => {
    expect(toSyncLog({ error_message: "" }).errorMessage).toBeNull();
    expect(toSyncLog({ error_message: "timeout" }).errorMessage).toBe("timeout");
  });
});
