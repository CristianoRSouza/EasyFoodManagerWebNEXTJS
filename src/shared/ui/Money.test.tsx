import { render } from "@testing-library/react";
import { Money } from "./Money";

describe("Money", () => {
  it("duas casas com ponto decimal, sem separador de milhar (igual ao legado)", () => {
    expect(render(<Money value={8.5} />).container.textContent).toBe("R$ 8.50");
    expect(render(<Money value={1234.567} />).container.textContent).toBe("R$ 1234.57");
    expect(render(<Money value={0} />).container.textContent).toBe("R$ 0.00");
  });
});
