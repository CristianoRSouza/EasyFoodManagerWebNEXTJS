import { toUnifiedAuditLog } from "./unified-audit-log-mapper";

describe("toUnifiedAuditLog", () => {
  it("mantém a linha da API como veio", () => {
    expect(
      toUnifiedAuditLog({
        id: "l1",
        source: "agent",
        entity_id: "a1",
        entity_name: "NFCe-SRV",
        action: "toggled",
        changed_fields: ["is_active"],
        previous_values: { is_active: true },
        new_values: { is_active: false },
        performed_by: "admin@empresa.com",
        created_at: "2026-01-15T08:00:00Z",
      }),
    ).toEqual({
      id: "l1",
      source: "agent",
      entity_id: "a1",
      entity_name: "NFCe-SRV",
      action: "toggled",
      changed_fields: ["is_active"],
      previous_values: { is_active: true },
      new_values: { is_active: false },
      performed_by: "admin@empresa.com",
      created_at: "2026-01-15T08:00:00Z",
    });
  });

  it("jsonb em texto, campos nulos e defaults do legado (performed_by 'admin')", () => {
    const log = toUnifiedAuditLog({
      id: 7,
      source: "totem",
      entity_id: "t1",
      action: "created",
      changed_fields: null,
      previous_values: null,
      new_values: '{"totem_name":"TOTEM-01"}',
      performed_by: null,
      created_at: "2026-01-15T08:00:00Z",
    });
    expect(log).toMatchObject({
      id: "7",
      entity_name: undefined,
      changed_fields: [],
      previous_values: {},
      new_values: { totem_name: "TOTEM-01" },
      performed_by: "admin",
    });
  });

  it("ação desconhecida é exibida como 'Editado' (fallback do legado)", () => {
    expect(toUnifiedAuditLog({ id: "1", source: "totem", action: "deleted" })?.action).toBe("updated");
  });

  it("origem desconhecida é descartada (o legado quebraria a tela inteira)", () => {
    expect(toUnifiedAuditLog({ id: "1", source: "printer", action: "created" })).toBeNull();
  });
});
