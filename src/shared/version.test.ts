import { formatVersionLabel, APP_VERSION_LABEL } from "./version";

describe("formatVersionLabel", () => {
  it("preenche o patch com dois dígitos, como no legado", () => {
    expect(formatVersionLabel("1.2.5")).toBe("1.2.05");
    expect(formatVersionLabel("1.2.96")).toBe("1.2.96");
  });

  it("devolve a versão sem mexer quando não é x.y.z", () => {
    expect(formatVersionLabel("1.2.96-beta")).toBe("1.2.96-beta");
  });

  it("usa a versão do package.json (injetada pelo next.config/vitest.config) — a mesma do legado 1.3.13", () => {
    expect(APP_VERSION_LABEL).toBe("1.3.13");
  });
});
