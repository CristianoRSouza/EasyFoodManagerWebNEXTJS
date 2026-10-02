import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, TableBody, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { hideBelow, ResponsiveTableWrapper, ResponsiveTableHead, ResponsiveTableCell } from "./ResponsiveTable";

describe("hideBelow", () => {
  it("mapeia cada breakpoint para a classe utilitária correspondente", () => {
    expect(hideBelow("sm")).toBe("hidden sm:table-cell");
    expect(hideBelow("md")).toBe("hidden md:table-cell");
    expect(hideBelow("lg")).toBe("hidden lg:table-cell");
    expect(hideBelow("xl")).toBe("hidden xl:table-cell");
  });
});

describe("ResponsiveTableWrapper", () => {
  it("aplica maxHeight via style quando informado", () => {
    const { container } = render(
      <ResponsiveTableWrapper maxHeight="32rem">
        <span>conteúdo</span>
      </ResponsiveTableWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.maxHeight).toBe("32rem");
  });

  it("não define style quando maxHeight não é informado", () => {
    const { container } = render(
      <ResponsiveTableWrapper>
        <span>conteúdo</span>
      </ResponsiveTableWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.maxHeight).toBe("");
  });
});

describe("ResponsiveTableHead / ResponsiveTableCell", () => {
  it("aplica a classe hideBelow apenas quando a prop é passada", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <ResponsiveTableHead hideBelow="md">Coluna</ResponsiveTableHead>
            <ResponsiveTableHead>Sempre visível</ResponsiveTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <ResponsiveTableCell hideBelow="lg">Valor</ResponsiveTableCell>
            <ResponsiveTableCell>Sempre visível</ResponsiveTableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Coluna").className).toContain("hidden md:table-cell");
    expect(screen.getByText("Valor").className).toContain("hidden lg:table-cell");
    const [alwaysVisible] = screen.getAllByText("Sempre visível");
    expect(alwaysVisible?.className).not.toContain("hidden");
  });
});
