import { buildNavGroups, isNavItemActive } from "./nav-items";

const titles = (groups: ReturnType<typeof buildNavGroups>) => groups.flatMap((g) => g.items.map((i) => i.title));

describe("buildNavGroups", () => {
  it("mantém os grupos e a ordem do legado", () => {
    const groups = buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: false });
    expect(groups.map((g) => g.label)).toEqual(["Visão Geral", "Operação", "Cadastros", "Infra / Serviços", "Falar com o suporte"]);
    expect(titles(groups)).toEqual([
      "Dashboard", "Receitas", "Comandas", "Transações", "NFC-e", "Produtos", "Unidades", "Emitente NFC-e",
      "Sincronização", "Totens", "PIXnoPDV", "Agentes de Serviço", "Planos", "Créditos IA", "Manual",
    ]);
  });

  it("modo loja ganha o Espelho FB↔PG", () => {
    expect(titles(buildNavGroups({ backend: "lan", isSystemAdmin: false, isCompanyAdmin: false }))).toContain("Espelho FB↔PG");
    expect(titles(buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: false }))).not.toContain("Espelho FB↔PG");
  });

  it("nuvem: admin da empresa vê códigos de primeiro acesso; admin do sistema vê também a auditoria", () => {
    const companyAdmin = titles(buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: true }));
    expect(companyAdmin).toContain("Códigos de primeiro acesso");
    expect(companyAdmin).not.toContain("Logs de Auditoria");
    const systemAdmin = titles(buildNavGroups({ backend: "cloud", isSystemAdmin: true, isCompanyAdmin: false }));
    expect(systemAdmin).toContain("Códigos de primeiro acesso");
    expect(systemAdmin).toContain("Logs de Auditoria");
  });
});

describe("isNavItemActive (mesma regra do NavLink do legado)", () => {
  it("'/' só é ativo na raiz", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/products", "/")).toBe(false);
  });
  it("demais itens ficam ativos nas subrotas", () => {
    expect(isNavItemActive("/nfce/123", "/nfce")).toBe(true);
    expect(isNavItemActive("/nfce-issuer", "/nfce")).toBe(false);
    expect(isNavItemActive("/sync/espelho", "/sync")).toBe(true);
  });
});
