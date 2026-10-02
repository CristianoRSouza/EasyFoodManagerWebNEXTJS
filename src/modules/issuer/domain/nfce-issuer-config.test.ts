import { certificateDaysLeft, isCertificateExpired, isCertificateUrgent, tefSecretLabel } from "./nfce-issuer-config";

const NOW = new Date("2026-01-15T12:00:00Z");

describe("isCertificateExpired", () => {
  it("sem data de validade, não está expirado", () => {
    expect(isCertificateExpired(null, NOW)).toBe(false);
  });

  it("data no passado, está expirado", () => {
    expect(isCertificateExpired("2025-01-15T12:00:00Z", NOW)).toBe(true);
  });

  it("data no futuro, não está expirado", () => {
    expect(isCertificateExpired("2026-06-15T12:00:00Z", NOW)).toBe(false);
  });
});

describe("certificateDaysLeft", () => {
  it("sem data de validade, devolve null", () => {
    expect(certificateDaysLeft(null, NOW)).toBeNull();
  });

  it("10 dias no futuro, devolve 10", () => {
    expect(certificateDaysLeft("2026-01-25T12:00:00Z", NOW)).toBe(10);
  });

  it("já vencido há 5 dias, devolve negativo", () => {
    expect(certificateDaysLeft("2026-01-10T12:00:00Z", NOW)).toBe(-5);
  });
});

describe("isCertificateUrgent", () => {
  it("null (sem data) não é urgente", () => {
    expect(isCertificateUrgent(null)).toBe(false);
  });

  it("29 dias é urgente (< 30)", () => {
    expect(isCertificateUrgent(29)).toBe(true);
  });

  it("30 dias não é urgente ainda", () => {
    expect(isCertificateUrgent(30)).toBe(false);
  });

  it("negativo (já vencido) é urgente", () => {
    expect(isCertificateUrgent(-3)).toBe(true);
  });
});

describe("tefSecretLabel (legado 1.3.12, tefSegredoDefinido)", () => {
  it("sem valor e sem indicador: travessão", () => {
    expect(tefSecretLabel(null, false, false)).toBe("—");
    expect(tefSecretLabel("  ", undefined, true)).toBe("—");
  });

  it("indicador cifrado sem valor em claro já conta como definido (antes mostrava —)", () => {
    expect(tefSecretLabel(null, true, false)).toBe("•••••••• (definido — cifrado na BD)");
    expect(tefSecretLabel(null, true, true)).toBe("•••••••• (definido na loja)");
  });

  it("nunca devolve o valor em claro", () => {
    expect(tefSecretLabel("SEGREDO", false, false)).not.toContain("SEGREDO");
    expect(tefSecretLabel("SEGREDO", false, true)).toBe("•••••••• (definido na loja)");
  });
});
