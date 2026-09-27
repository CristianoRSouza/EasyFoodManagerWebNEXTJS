import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { cn } from "../cn";

describe("primitivas copiadas do legado", () => {
  it("Button mantém as classes do legado", () => {
    render(<Button>Entrar</Button>);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("h-10");
  });

  it("cn resolve conflito de classes Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
