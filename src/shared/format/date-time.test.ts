import { formatDate, formatDateTime } from "./date-time";

describe("formatDateTime / formatDate", () => {
  const iso = "2026-01-15T10:20:00Z";

  it("usa o formato pt-BR do navegador, como o legado", () => {
    expect(formatDateTime(iso)).toBe(new Date(iso).toLocaleString("pt-BR"));
    expect(formatDate(iso)).toBe(new Date(iso).toLocaleDateString("pt-BR"));
  });

  it("valor ausente vira travessão", () => {
    for (const value of [null, undefined, ""]) {
      expect(formatDateTime(value)).toBe("—");
      expect(formatDate(value)).toBe("—");
    }
  });
});
