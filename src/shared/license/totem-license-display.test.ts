import { describe, it, expect } from "vitest";
import {
  effectiveTotemIsActive,
  hasActiveTotemLicense,
  hasTotemLicenseInLocalPg,
} from "./totem-license-display";

describe("totem-license-display", () => {
  describe("hasActiveTotemLicense", () => {
    it("sem license_id não tem licença ativa", () => {
      expect(hasActiveTotemLicense({ license_id: null, license_status: "active" })).toBe(false);
      expect(hasActiveTotemLicense({ license_id: "", license_status: "active" })).toBe(false);
      expect(hasActiveTotemLicense({ license_id: "   ", license_status: "active" })).toBe(false);
    });

    it("com license_id e status active (case-insensitive) é ativa", () => {
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: "active" })).toBe(true);
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: "ACTIVE" })).toBe(true);
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: "  Active  " })).toBe(true);
    });

    it("license_id presente mas status diferente de active não é ativa", () => {
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: "expired" })).toBe(false);
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: null })).toBe(false);
      expect(hasActiveTotemLicense({ license_id: "lic-1", license_status: undefined })).toBe(false);
    });
  });

  describe("effectiveTotemIsActive", () => {
    it("precisa de is_active true E licença ativa", () => {
      expect(
        effectiveTotemIsActive({ is_active: true, license_id: "lic-1", license_status: "active" }),
      ).toBe(true);
    });

    it("is_active true mas sem licença ativa não conta (ignora is_active órfão)", () => {
      expect(
        effectiveTotemIsActive({ is_active: true, license_id: null, license_status: null }),
      ).toBe(false);
      expect(
        effectiveTotemIsActive({ is_active: true, license_id: "lic-1", license_status: "expired" }),
      ).toBe(false);
    });

    it("licença ativa mas is_active false não conta", () => {
      expect(
        effectiveTotemIsActive({ is_active: false, license_id: "lic-1", license_status: "active" }),
      ).toBe(false);
    });

    it("is_active ausente (null/undefined) é tratado como false", () => {
      expect(
        effectiveTotemIsActive({ is_active: null, license_id: "lic-1", license_status: "active" }),
      ).toBe(false);
      expect(
        effectiveTotemIsActive({ is_active: undefined, license_id: "lic-1", license_status: "active" }),
      ).toBe(false);
    });
  });

  describe("hasTotemLicenseInLocalPg (deprecated, delega para hasActiveTotemLicense)", () => {
    it("mesmo resultado do sucessor", () => {
      const totem = { license_id: "lic-1", license_status: "active" };
      expect(hasTotemLicenseInLocalPg(totem)).toBe(hasActiveTotemLicense(totem));
    });
  });
});
