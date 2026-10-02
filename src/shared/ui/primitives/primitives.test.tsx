import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Switch } from "./switch";
import { RadioGroup, RadioGroupItem } from "./radio-group";
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

  it("Alert destructive mantém a variante do legado", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Falha</AlertTitle>
        <AlertDescription>Algo deu errado.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-destructive/50");
    expect(screen.getByText("Falha")).toBeInTheDocument();
    expect(screen.getByText("Algo deu errado.")).toBeInTheDocument();
  });

  it("Switch alterna estado via data-state", () => {
    render(<Switch aria-label="Ativo" defaultChecked={false} />);
    const toggle = screen.getByRole("switch", { name: "Ativo" });
    expect(toggle).toHaveAttribute("data-state", "unchecked");
    expect(toggle.className).toContain("data-[state=checked]:bg-primary");
  });

  it("RadioGroup marca o item selecionado", () => {
    render(
      <RadioGroup defaultValue="b" aria-label="Opções">
        <RadioGroupItem value="a" aria-label="A" />
        <RadioGroupItem value="b" aria-label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("data-state", "unchecked");
  });
});
