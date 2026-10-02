import { describe, expect, it } from "vitest";
import { UNKNOWN_LICENSE, headerLicenseWarning, licenseBannerCopy, toLicenseStatus, type LicenseStatus } from "./license-status";

const status = (over: Partial<LicenseStatus>): LicenseStatus => ({ ...UNKNOWN_LICENSE, planSlug: "standard-1", ...over });

describe("toLicenseStatus (resposta de GET /billing/license, já classificada pelo servidor)", () => {
  it("aceita a forma da API", () => {
    const raw = {
      state: "expiring_soon",
      planSlug: "standard-1",
      planName: "Standard 1",
      expiresAt: "2026-10-03T00:00:00Z",
      isActive: true,
      daysUntilExpiry: 3,
    };
    expect(toLicenseStatus(raw)).toEqual(raw);
  });

  it("estado desconhecido ou resposta vazia viram 'unknown' (fallback silencioso, como o legado)", () => {
    expect(toLicenseStatus(null)).toEqual(UNKNOWN_LICENSE);
    expect(toLicenseStatus({ state: "qualquer" }).state).toBe("unknown");
    expect(toLicenseStatus({ state: "expired", daysUntilExpiry: "-2" }).daysUntilExpiry).toBe(-2);
  });
});

describe("licenseBannerCopy (textos de LicenseExpiredBanner.tsx)", () => {
  it("ativa ou desconhecida: sem faixa", () => {
    expect(licenseBannerCopy(status({ state: "active" }))).toBeNull();
    expect(licenseBannerCopy(UNKNOWN_LICENSE)).toBeNull();
    expect(licenseBannerCopy(undefined)).toBeNull();
  });

  it("expirada, com e sem nome de plano e data", () => {
    expect(licenseBannerCopy(status({ state: "expired", planName: "Standard 1", expiresAt: "2026-09-20T12:00:00Z" }))).toEqual({
      isExpired: true,
      title: "Seu plano expirou e não foi renovado",
      description: "A licença do plano Standard 1 venceu em 20/09/2026. Revise o pagamento para restaurar todos os recursos.",
    });
    expect(licenseBannerCopy(status({ state: "expired" }))?.description).toBe(
      "A licença venceu. Revise o pagamento para restaurar todos os recursos.",
    );
  });

  it("expirando em breve", () => {
    expect(licenseBannerCopy(status({ state: "expiring_soon", daysUntilExpiry: 5, expiresAt: "2026-10-05T12:00:00Z" }))).toEqual({
      isExpired: false,
      title: "Renovação do plano pendente",
      description: "Sua licença expira em 5 dia(s) (05/10/2026). Revise o pagamento para evitar interrupções.",
    });
    expect(licenseBannerCopy(status({ state: "expiring_soon" }))?.description).toBe(
      "Sua licença expira em poucos dia(s). Revise o pagamento para evitar interrupções.",
    );
  });
});

describe("headerLicenseWarning (ícone no HeaderStoreInfo)", () => {
  it("só para expirada/expirando", () => {
    expect(headerLicenseWarning(status({ state: "active" }))).toBeNull();
    expect(headerLicenseWarning(status({ state: "expired" }))).toEqual({
      isExpired: true,
      label: "Plano expirado",
      tooltip: "Plano expirado — revise o pagamento.",
    });
    expect(headerLicenseWarning(status({ state: "expiring_soon", daysUntilExpiry: 2 }))).toEqual({
      isExpired: false,
      label: "Plano próximo do vencimento",
      tooltip: "Plano expira em 2 dia(s).",
    });
  });
});
