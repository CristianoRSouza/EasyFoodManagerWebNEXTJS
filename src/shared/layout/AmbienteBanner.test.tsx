import { render, screen } from "@testing-library/react";
import { AmbienteBanner } from "./AmbienteBanner";

describe("AmbienteBanner (legado 1.3.12, PRs #48/#50)", () => {
  it("homologação: faixa com o texto do legado", () => {
    render(<AmbienteBanner ambiente="homolog" />);
    const faixa = screen.getByTestId("ambiente-banner");
    expect(faixa).toHaveTextContent("Homologação — ambiente de testes (banco de homologação).");
    expect(faixa).toHaveAttribute("role", "status");
  });

  it("produção (ou ambiente ausente): não renderiza nada", () => {
    const { container } = render(<AmbienteBanner ambiente="producao" />);
    expect(container).toBeEmptyDOMElement();
    const { container: semAmbiente } = render(<AmbienteBanner ambiente={undefined} />);
    expect(semAmbiente).toBeEmptyDOMElement();
  });
});
