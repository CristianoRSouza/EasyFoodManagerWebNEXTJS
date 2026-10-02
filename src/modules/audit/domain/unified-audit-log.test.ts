import {
  AUDIT_FIELD_LABELS,
  DEFAULT_AUDIT_FILTERS,
  buildPageItems,
  filterUnifiedAuditLogs,
  hasActiveAuditFilters,
  paginateAuditLogs,
  type UnifiedAuditLog,
} from "./unified-audit-log";

const NOW = new Date("2026-01-20T12:00:00");

function log(overrides: Partial<UnifiedAuditLog>): UnifiedAuditLog {
  return {
    id: "x",
    source: "totem",
    entity_id: "e1",
    entity_name: "TOTEM-01",
    action: "updated",
    changed_fields: [],
    previous_values: {},
    new_values: {},
    performed_by: "admin@empresa.com",
    created_at: "2026-01-20T08:00:00",
    ...overrides,
  };
}

const logs: UnifiedAuditLog[] = [
  log({ id: "a", source: "totem", action: "created", performed_by: "Maria@Empresa.com", created_at: "2026-01-20T08:00:00" }),
  log({ id: "b", source: "agent", action: "updated", performed_by: "joao@empresa.com", created_at: "2026-01-15T08:00:00" }),
  log({ id: "c", source: "agent", action: "toggled", performed_by: "maria@empresa.com", created_at: "2025-11-01T08:00:00" }),
];

describe("filterUnifiedAuditLogs", () => {
  it("padrão do legado: últimos 30 dias, todas as origens/ações", () => {
    expect(filterUnifiedAuditLogs(logs, DEFAULT_AUDIT_FILTERS, NOW).map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("filtra por origem, ação e período", () => {
    const all = { ...DEFAULT_AUDIT_FILTERS, period: "all" as const };
    expect(filterUnifiedAuditLogs(logs, { ...all, source: "agent" }, NOW).map((l) => l.id)).toEqual(["b", "c"]);
    expect(filterUnifiedAuditLogs(logs, { ...all, action: "toggled" }, NOW).map((l) => l.id)).toEqual(["c"]);
    expect(filterUnifiedAuditLogs(logs, { ...all, period: "today" }, NOW).map((l) => l.id)).toEqual(["a"]);
  });

  it("usuário: trecho sem diferenciar maiúsculas, ignorando espaços nas pontas", () => {
    const all = { ...DEFAULT_AUDIT_FILTERS, period: "all" as const };
    expect(filterUnifiedAuditLogs(logs, { ...all, user: "  MARIA " }, NOW).map((l) => l.id)).toEqual(["a", "c"]);
    expect(filterUnifiedAuditLogs(logs, { ...all, user: "   " }, NOW)).toHaveLength(3);
  });
});

describe("hasActiveAuditFilters", () => {
  it("o padrão (30 dias) não conta como filtro; qualquer outro valor conta", () => {
    expect(hasActiveAuditFilters(DEFAULT_AUDIT_FILTERS)).toBe(false);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, period: "all" })).toBe(true);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, source: "totem" })).toBe(true);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, action: "created" })).toBe(true);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, user: "  " })).toBe(false);
    expect(hasActiveAuditFilters({ ...DEFAULT_AUDIT_FILTERS, user: "a" })).toBe(true);
  });
});

describe("paginateAuditLogs", () => {
  const many = Array.from({ length: 35 }, (_, i) => log({ id: String(i) }));

  it("fatia pela página e prende a página atual ao total", () => {
    const p = paginateAuditLogs(many, 2, 30);
    expect(p.totalPages).toBe(2);
    expect(p.safePage).toBe(2);
    expect(p.visible.map((l) => l.id)).toEqual(["30", "31", "32", "33", "34"]);
    expect(paginateAuditLogs(many, 9, 30).safePage).toBe(2);
  });

  it("lista vazia ainda tem uma página", () => {
    expect(paginateAuditLogs([], 1, 30)).toEqual({ totalPages: 1, safePage: 1, visible: [] });
  });
});

describe("buildPageItems", () => {
  it("primeira, última e vizinhas da atual, com reticências nos buracos", () => {
    expect(buildPageItems(1, 1)).toEqual([1]);
    expect(buildPageItems(3, 2)).toEqual([1, 2, 3]);
    expect(buildPageItems(10, 5)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    expect(buildPageItems(10, 1)).toEqual([1, 2, "ellipsis", 10]);
    expect(buildPageItems(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });
});

describe("AUDIT_FIELD_LABELS", () => {
  it("rótulos do legado", () => {
    expect(AUDIT_FIELD_LABELS.totem_name).toBe("Nome");
    expect(AUDIT_FIELD_LABELS.sync_service_url).toBe("URL de sincronização");
  });
});
