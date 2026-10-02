import { formatBrl } from "./money";

describe("formatBrl", () => {
  it("formata em real, com vírgula decimal", () => {
    expect(formatBrl(1234.5)).toMatch(/^R\$\s?1\.234,50$/);
  });
});
