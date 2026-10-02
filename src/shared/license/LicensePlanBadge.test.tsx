import { render, screen } from "@testing-library/react";
import { LicensePlanBadge } from "./LicensePlanBadge";

describe("LicensePlanBadge", () => {
  it("mostra o rótulo do plano pago sem ícone de demo", () => {
    render(<LicensePlanBadge licenseType="monthly" planSlug="ecp-standard" />);
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.queryByTitle("Licença de demonstração — sem plano contratado")).not.toBeInTheDocument();
  });

  it("licença demo mostra badge com título de aviso", () => {
    render(<LicensePlanBadge licenseType="monthly" planSlug="ecp-demo" />);
    expect(screen.getByTitle("Licença de demonstração — sem plano contratado")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("displayLabel sobrescreve o rótulo automático", () => {
    render(<LicensePlanBadge licenseType="monthly" planSlug="ecp-standard" displayLabel="Standard 2" />);
    expect(screen.getByText("Standard 2")).toBeInTheDocument();
  });
});
