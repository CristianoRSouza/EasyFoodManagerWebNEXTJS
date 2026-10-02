import { describe, it, expect } from "vitest";
import {
  resolveTotemLicensePolicy,
  isEditingPaidLicense,
  filterSelectableLicensesForPage,
  filterFreeLicenses,
  resolveCurrentLicense,
  filterDialogSelectableLicenses,
  computeLicenseIsDemo,
  hasSomeLicense,
} from "./totem-license-policy";
import type { TotemConfig, TotemLicenseSlot } from "./totem-config";

const slot = (over: Partial<TotemLicenseSlot> = {}): TotemLicenseSlot => ({
  id: "lic-1",
  device_key: "TOTEM-001",
  license_type: "monthly",
  plan_slug: "ecp-standard",
  status: "active",
  totem_config_id: null,
  ...over,
});

const totem = (over: Partial<TotemConfig> = {}): TotemConfig => ({
  id: "t1",
  totem_name: "TOTEM-001",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("resolveTotemLicensePolicy", () => {
  it("lan: localPgOnly true, cloudMode false, pool sempre true", () => {
    expect(resolveTotemLicensePolicy("lan")).toEqual({ cloudMode: false, localPgOnly: true, licensePoolMode: true });
  });
  it("cloud: cloudMode true, localPgOnly false, pool sempre true", () => {
    expect(resolveTotemLicensePolicy("cloud")).toEqual({ cloudMode: true, localPgOnly: false, licensePoolMode: true });
  });
});

describe("isEditingPaidLicense", () => {
  it("null totem -> false", () => expect(isEditingPaidLicense(null)).toBe(false));
  it("licença ativa Demo -> false", () => {
    expect(isEditingPaidLicense(totem({ license_id: "l1", license_status: "active", plan_slug: "ecp-demo" }))).toBe(false);
  });
  it("licença ativa paga -> true", () => {
    expect(isEditingPaidLicense(totem({ license_id: "l1", license_status: "active", plan_slug: "ecp-standard" }))).toBe(true);
  });
  it("sem licença ativa -> false", () => {
    expect(isEditingPaidLicense(totem({ license_id: null }))).toBe(false);
  });
});

describe("filterSelectableLicensesForPage", () => {
  const licenses = [slot({ id: "demo", plan_slug: "ecp-demo" }), slot({ id: "paid", plan_slug: "ecp-pro" })];
  it("localPgOnly=true: só Demo", () => {
    expect(filterSelectableLicensesForPage(licenses, true).map((l) => l.id)).toEqual(["demo"]);
  });
  it("localPgOnly=false: todas", () => {
    expect(filterSelectableLicensesForPage(licenses, false).map((l) => l.id)).toEqual(["demo", "paid"]);
  });
});

describe("filterFreeLicenses", () => {
  it("mantém só as sem totem_config_id", () => {
    const licenses = [slot({ id: "free", totem_config_id: null }), slot({ id: "bound", totem_config_id: "t9" })];
    expect(filterFreeLicenses(licenses).map((l) => l.id)).toEqual(["free"]);
  });
});

describe("resolveCurrentLicense", () => {
  it("totem null -> null", () => expect(resolveCurrentLicense(null, [])).toBeNull());
  it("acha a licença carregada vinculada ao totem", () => {
    const t = totem();
    const licenses = [slot({ id: "l1", totem_config_id: "t1" })];
    expect(resolveCurrentLicense(t, licenses)?.id).toBe("l1");
  });
  it("sem licença carregada e sem license_id -> null", () => {
    expect(resolveCurrentLicense(totem({ license_id: null }), [])).toBeNull();
  });
  it("fallback sintético usa totem_name como device_key (nunca license_device_key)", () => {
    const t = totem({ license_id: "l9", license_status: "active", license_type: "monthly", plan_slug: "ecp-pro" });
    expect(resolveCurrentLicense(t, [])).toEqual({
      id: "l9",
      device_key: "TOTEM-001",
      license_type: "monthly",
      plan_slug: "ecp-pro",
      status: "active",
      totem_config_id: "t1",
    });
  });
});

describe("filterDialogSelectableLicenses", () => {
  const licenses = [
    slot({ id: "free", totem_config_id: null }),
    slot({ id: "mine", totem_config_id: "t1" }),
    slot({ id: "other", totem_config_id: "t2" }),
  ];
  it("licensePoolMode=false -> vazio", () => {
    expect(filterDialogSelectableLicenses(licenses, false, "t1")).toEqual([]);
  });
  it("licensePoolMode=true -> livres + a do próprio totem", () => {
    expect(filterDialogSelectableLicenses(licenses, true, "t1").map((l) => l.id)).toEqual(["free", "mine"]);
  });
  it("totem novo (totemId null) -> só livres", () => {
    expect(filterDialogSelectableLicenses(licenses, true, null).map((l) => l.id)).toEqual(["free"]);
  });
});

describe("computeLicenseIsDemo", () => {
  it("licença efetiva Demo -> true", () => {
    expect(computeLicenseIsDemo(slot({ plan_slug: "ecp-demo" }), null)).toBe(true);
  });
  it("licença efetiva paga -> false", () => {
    expect(computeLicenseIsDemo(slot({ plan_slug: "ecp-pro" }), null)).toBe(false);
  });
  it("sem licença efetiva, cai no totem (plan_slug)", () => {
    expect(computeLicenseIsDemo(null, { license_type: null, plan_slug: "ecp-demo" })).toBe(true);
  });
  it("sem licença nenhuma -> false", () => {
    expect(computeLicenseIsDemo(null, null)).toBe(false);
    expect(computeLicenseIsDemo(null, { license_type: null, plan_slug: null })).toBe(false);
  });
});

describe("hasSomeLicense", () => {
  it("licença efetiva presente -> true", () => expect(hasSomeLicense(slot(), null)).toBe(true));
  it("totem com license_id preenchido -> true", () => expect(hasSomeLicense(null, { license_id: "l1" })).toBe(true));
  it("nenhum dos dois -> false", () => {
    expect(hasSomeLicense(null, null)).toBe(false);
    expect(hasSomeLicense(null, { license_id: "  " })).toBe(false);
  });
});
