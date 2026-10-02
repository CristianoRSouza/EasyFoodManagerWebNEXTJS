import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NfceStatusBadge } from "./NfceStatusBadge";

describe("NfceStatusBadge", () => {
  it("mostra o rótulo em português e a classe de cor do status", () => {
    render(<NfceStatusBadge status="authorized" />);
    const badge = screen.getByText("Autorizada");
    expect(badge.className).toContain("green");
  });

  it("dobra o alias `inutilizada` e mostra o rótulo certo", () => {
    render(<NfceStatusBadge status="inutilizada" />);
    expect(screen.getByText("Inutilizada")).toBeInTheDocument();
  });
});
