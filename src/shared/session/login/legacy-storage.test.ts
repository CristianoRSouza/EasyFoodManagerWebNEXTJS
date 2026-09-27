import { purgeLegacyPasswordStorage } from "./legacy-storage";

const LEGACY_KEYS = ["password", "ecp_admin_password", "ecp_admin_last_password"];

describe("purgeLegacyPasswordStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("remove as três chaves legadas de localStorage e sessionStorage", () => {
    for (const key of LEGACY_KEYS) {
      localStorage.setItem(key, "segredo");
      sessionStorage.setItem(key, "segredo");
    }

    purgeLegacyPasswordStorage();

    for (const key of LEGACY_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
  });

  it("não lança quando as chaves não existem", () => {
    expect(() => purgeLegacyPasswordStorage()).not.toThrow();
  });
});
