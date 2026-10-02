import { render, screen } from "@testing-library/react";
import { LicenseStatusBadge } from "./LicenseStatusBadge";

describe("LicenseStatusBadge", () => {
  it("inativa quando isActive é false", () => {
    render(<LicenseStatusBadge isActive={false} expiresAt={null} />);
    expect(screen.getByText("Inativa")).toBeInTheDocument();
  });

  it("expirada quando expiresAt já passou", () => {
    render(<LicenseStatusBadge isActive expiresAt="2020-01-01T00:00:00Z" />);
    expect(screen.getByText("Expirada")).toBeInTheDocument();
  });

  it("expirando quando faltam 7 dias ou menos", () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    render(<LicenseStatusBadge isActive expiresAt={soon} />);
    expect(screen.getByText(/Expirando \(\d+d\)/)).toBeInTheDocument();
  });

  it("ativa quando falta mais de 7 dias", () => {
    const later = new Date(Date.now() + 30 * 86_400_000).toISOString();
    render(<LicenseStatusBadge isActive expiresAt={later} />);
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });

  it("ativa sem data de expiração", () => {
    render(<LicenseStatusBadge isActive expiresAt={null} />);
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });
});
