import { describe, it, expect } from "vitest";
import {
  buildLicenseLabelMap,
  compareLicensesForLabelOrder,
  getLicensePlanLabel,
  isDemoLicense,
} from "./license-labels";

describe("license-labels", () => {
  it("getLicensePlanLabel prioriza plan_slug", () => {
    expect(getLicensePlanLabel("monthly", "ecp-standard")).toBe("Standard");
    expect(getLicensePlanLabel("monthly", "ecp-demo")).toBe("Demo");
  });

  it("fallback monthly/trial para Demo", () => {
    expect(getLicensePlanLabel("monthly", null)).toBe("Demo");
    expect(getLicensePlanLabel("trial", null)).toBe("Demo");
    expect(getLicensePlanLabel(null, null)).toBe("Demo");
    expect(getLicensePlanLabel("", "   ")).toBe("Demo");
  });

  it("resolve license_type anual e slug desconhecido", () => {
    expect(getLicensePlanLabel("annual", null)).toBe("Anual");
    expect(getLicensePlanLabel("yearly", null)).toBe("Anual");
    expect(getLicensePlanLabel("perpetual", null)).toBe("Perpétua");
    expect(getLicensePlanLabel(null, "ecp-custom-plan")).toBe("Ecp Custom Plan");
  });

  it("isDemoLicense", () => {
    expect(isDemoLicense("monthly", "ecp-demo")).toBe(true);
    expect(isDemoLicense("monthly", "ecp-standard")).toBe(false);
    expect(isDemoLicense("monthly", null)).toBe(true);
    expect(isDemoLicense("demo", null)).toBe(true);
    expect(isDemoLicense("annual", "ecp-pro")).toBe(false);
    expect(isDemoLicense("demo", "ecp-standard")).toBe(false);
  });

  it("compareLicensesForLabelOrder desempata por id quando data e device_key coincidem", () => {
    const a = { id: "b-id", created_at: "2026-01-01T00:00:00Z", device_key: "TOTEM-061" };
    const b = { id: "a-id", created_at: "2026-01-01T00:00:00Z", device_key: "TOTEM-061" };
    expect(compareLicensesForLabelOrder(a, b)).toBeGreaterThan(0);
    expect(compareLicensesForLabelOrder(b, a)).toBeLessThan(0);
  });

  it("buildLicenseLabelMap com lista vazia", () => {
    expect(buildLicenseLabelMap([]).size).toBe(0);
  });

  it("buildLicenseLabelMap numera grupos distintos independentemente", () => {
    const map = buildLicenseLabelMap([
      { id: "d1", license_type: "monthly", plan_slug: "ecp-demo", created_at: "2026-01-01T00:00:00Z" },
      { id: "s1", license_type: "x", plan_slug: "ecp-standard", created_at: "2026-01-01T00:00:00Z" },
      { id: "d2", license_type: "monthly", plan_slug: "ecp-demo", created_at: "2026-01-02T00:00:00Z" },
    ]);
    expect(map.get("d1")).toBe("Demo 1");
    expect(map.get("d2")).toBe("Demo 2");
    expect(map.get("s1")).toBe("Standard 1");
  });

  it("buildLicenseLabelMap desempata created_at igual por device_key", () => {
    const map = buildLicenseLabelMap([
      {
        id: "b",
        license_type: "x",
        plan_slug: "ecp-standard",
        created_at: "2026-01-01T00:00:00Z",
        device_key: "TOTEM-062",
      },
      {
        id: "a",
        license_type: "x",
        plan_slug: "ecp-standard",
        created_at: "2026-01-01T00:00:00Z",
        device_key: "TOTEM-061",
      },
    ]);
    expect(map.get("a")).toBe("Standard 1");
    expect(map.get("b")).toBe("Standard 2");
  });

  it("buildLicenseLabelMap numera por created_at sem re-sequenciar gaps", () => {
    const map = buildLicenseLabelMap([
      { id: "a", license_type: "x", plan_slug: "ecp-standard", created_at: "2026-01-03T00:00:00Z" },
      { id: "b", license_type: "x", plan_slug: "ecp-standard", created_at: "2026-01-01T00:00:00Z" },
      { id: "c", license_type: "x", plan_slug: "ecp-standard", created_at: "2026-01-02T00:00:00Z" },
    ]);
    expect(map.get("b")).toBe("Standard 1");
    expect(map.get("c")).toBe("Standard 2");
    expect(map.get("a")).toBe("Standard 3");
  });

  it("upgrade Demo para Standard troca prefixo", () => {
    const map = buildLicenseLabelMap([
      { id: "1", license_type: "monthly", plan_slug: "ecp-demo", created_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(map.get("1")).toBe("Demo 1");

    const map2 = buildLicenseLabelMap([
      { id: "1", license_type: "monthly", plan_slug: "ecp-standard", created_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(map2.get("1")).toBe("Standard 1");
  });
});
