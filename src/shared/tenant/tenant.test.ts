import { resolveSelection, type Store } from "./tenant";

const store = (id: string, company_id: string): Store => ({ id, company_id, trade_name: `Loja ${id}`, legacy_store_code: id });

describe("resolveSelection", () => {
  it("mantém a seleção salva quando a loja ainda existe na empresa", () => {
    const stores = [store("s1", "c1"), store("s2", "c1")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "s2" } })).toEqual({ companyId: "c1", storeId: "s2" });
  });

  it("descarta seleção salva de loja que não existe mais", () => {
    const stores = [store("s1", "c1"), store("s2", "c1")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "sumiu" } })).toBeNull();
  });

  it("descarta seleção salva cuja loja mudou de empresa", () => {
    const stores = [store("s1", "c2"), store("s9", "c2")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "s1" } })).toBeNull();
  });

  it("escolhe sozinho quando só existe uma loja", () => {
    expect(resolveSelection({ stores: [store("s1", "c1")], saved: { companyId: null, storeId: null } })).toEqual({ companyId: "c1", storeId: "s1" });
  });

  it("sem lojas não há seleção", () => {
    expect(resolveSelection({ stores: [], saved: { companyId: null, storeId: null } })).toBeNull();
  });
});
